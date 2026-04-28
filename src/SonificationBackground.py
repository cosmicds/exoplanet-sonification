

'''
script:     exoPlanetSonificationByPlanetType_v2.py
author:     Alex Shepard
date:       3/24/2025
Purpose:    create vla's and a wav file for an exoplanet sonification

Plan:       This python script is designed develope an up-to-date exoplanet sonification and digistar file.
    The plan is to color each exoplanet by type: Gas Giant, Neptunian, Super Earth, and Terrestrial by publicaiton date.
    Sometimes there will be one datapoint in the vla, sometimes there will be a few hundred. We will load all of
    the vla's as dotModelClass's and turn them on at the correct time while the audio (generated from this script)
    is played. If successful, it will look something like this within digistar: https://www.youtube.com/embed/OOwI3nTAHIc

research paper: https://repository.gatech.edu/server/api/core/bitstreams/dac9bed7-3c20-4596-80e1-cc12cd61e487/content

Description:    This script is broken down into 4 parts:
    
        1) Writing the vla's
        2) Writing ds file
        3) Prepping wav file variables
        4) Writing the wav file
    
    
    A separate vla will be writen for each month an exoplent is observed by parsing through the exoplanet archive by nasa.
    This means there will be some months with no vla file associated with them.This issue will be addressed in the javascript.
    There are some datapoints that make no sense Including but not limited to the month "00". We will have to do some data
    manipulation before parsing it into the wav file generation poition fo the script. Next, is writing the wav file.
    There are 2 methods within this that the author can choose: generating sin waves or stitching
    together recordings of different notes to be played from a specific instrument. Each of those ways were inspired
    from our future overlord, chat gpt.
'''


#import libraries
import numpy as np
from astropy import constants as const
from astropy import constants as u
import shutil
from astropy.table import Table
from strauss.sonification import Sonification
from strauss.sources import Objects, Events
from strauss import channels
from strauss import Strauss
from strauss.score import Score
from strauss.generator import Synthesizer
from strauss.generator import Sampler
from pathlib import Path
import copy
import pandas as pd
import os
import time
import sys
from sound import play_note_for_point
import subprocess
from tqdm import tqdm
import urllib.request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

strauss = Strauss()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/hello")
def hello():
    return {"message": "Hello from Python 👋"}

#Start timing the code
t0 = time.time()

def play_note_for_point(value):
    frequency = 200 + value * 10  # map your data point value to a frequency
    strauss.play(frequency=frequency, waveform='sine', duration=0.3)

@app.post("/play-point")
def play_point(data: PointData):
    # Your Strauss code to generate audio goes here
    print(f"Received pitch: {data.pitch}, duration: {data.duration}")
    # Return dummy response for now
    return {"status": "ok"}


#define final file names
dsaFileName = 'exoplanetSonificationByPlanets' #this is the prefix of the file names for the vla. it will be counted and padded with zeros + ".vla"
textFileName = 'exoplanetSonificationList.txt'
wavFile = '6000exoplanetSonification.wav'
dsFileName = 'exoplanetSonificationByPlanets_dsaVersion.ds'

audioDestination = '..\\audio'
scriptDestination = '..\\scripts'
dsaDestination = '..\\models\\exoplanetSonificationByType_dsa'

os.makedirs(audioDestination, exist_ok=True)
os.makedirs(scriptDestination, exist_ok=True)
os.makedirs(dsaDestination, exist_ok=True)


#define colors for the types of exoplanets
planetTypeColors = {
        "Gas Giants": {"red": 0.52, "green": 0.25, "blue": 0.18},
        "Neptunian": {"red": 0.2118, "green": 0.5373, "blue": 0.7725},
        "Super Earths": {"red": 0.85, "green": 0.75, "blue": 0.45},
        "Terrestrial": {"red": 0.36, "green": 0.66, "blue": 0.02}
    }

#ask the author how many seconds per month the author wants
timePerMonth = 0.25  #float(input("How many seconds per month do you want? (recommended 0.25, NASA uses 0.17) "))  #s

sustainTime = 4

effectiveSustainTime = 2

binSize = int(timePerMonth//timePerMonth)

#define the notes that we will use. This is the Emaj13 scale. It has the note name, frequency number, and the midi number
notes = [
    [
        'E1', 'B1', 'E2', 'B2', 'E3', 'G#3',
        'B3', 'D#4', 'E4', 'G#4', 'B4', 'C#5', 
        'D#5', 'F#5', 'G#5', 'B5', 'C#6',
        'D#6', 'F#6', 'G#6'
    ]
]

notesPlayedByBin = [0 for i in range(binSize)]

# , ['B6', 1975.53, 95], ['Db7', 2217.46, 97],
#          ['Eb7', 2489.02, 99], ['Gb7', 2960.0, 102], ['Ab7', 3322.44, 104]]


######################################### Write the vla's #################################################



# Define the URL for the NASA Exoplanet Archive API
url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=SELECT+pl_name,disc_pubdate,discoverymethod,pl_orbper,pl_orbsmax,pl_bmassj,st_mass,sy_dist,ra,dec+FROM+pscomppars+ORDER+BY+disc_pubdate+ASC&format=csv"

# Read the CSV data into a Pandas DataFrame
df = pd.read_csv(url)

# Fill NaN or None with 0
df = df.fillna(0)

df['planetType'] = 'Many characters because I need the space'
df['timeMedium'] = 0.0
df['numberOfNotesPlayed'] = 0

currentDate = df['disc_pubdate'][0]

#Some data points dont have period, but they do have variables that complete Kepler's third law
#this definition returns a period infered from that law. If the required variables are not met, then concede and let it be 0
def generatePeriod(a, m, M): #masses must be in M_jup

    if a == 0 or m == 0 or M == 0:
        return 0

    else:
        return (((4*np.pi)/(const.G.to('au**3/(M_jup*day**2)').value * (M + m))) * a**3)**(1/2)
    

### https://arxiv.org/pdf/1603.08614

#Create a definition to determine the planet type. We reference the above paper to make the mass distinctions
#this paper redefines the types of planets by looking at general planetary trends. This new trend puts saturn
#in the neptunian category but near the upper limit. The canonical 10 Earth Mass limit for super Earths is challenged
#to actually be about between 2.04 and 1.2 Earth Masses, much lower than previously categorized. Lastly, this
#paper claims that there is no noticable distinciton between Terrestrial planets and Dwarf planets. Pluto is planet???
def getPlanetType(mass): #assumes Jupiter mass

    #There are a handful of planets that do not have a mass component so we assume them to be the most common type of planet
    if mass == np.float64(0.0):
        return "Neptunian" 

    if mass > 0.414:
        return "Gas Giants"
    
    elif mass < 0.414 and mass > (2.04 * u.M_earth).to('M_jup').value:
        return "Neptunian"
    
    elif mass < (2.04 * u.M_earth).to('M_jup').value and mass > (1.2 * u.M_earth).to('M_jup').value:
        return "Super Earths"
    
    else:
        return "Terrestrial"

def scaleFrequency(f, f_min):
    return np.log(f/f_min)**2

# Function to map pandas dtypes to VOTable types
def votable_type(dtype):
    if pd.api.types.is_integer_dtype(dtype):
        return "int"
    elif pd.api.types.is_float_dtype(dtype):
        return "double"
    else:
        return "char"

def makeVOTable(mini_df, ra_col, dec_col, dist_col):
    # ra_col = 'ra'
    # dec_col = 'dec'
    # dist_col = 'sy_dist'

    # Build final VOTable
    votable_xml = f"""<?xml version="1.0"?>
<VOTABLE version="1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns="http://www.ivoa.net/xml/VOTable/v1.3"
xmlns:stc="http://www.ivoa.net/xml/STC/v1.30">
\t<RESOURCE type="results">
\t\t<TABLE>
"""


    field = ""
    for col in mini_df.columns:
        dtype = votable_type(mini_df[col].dtype)

        if col == ra_col:
            field += f"\t\t\t<FIELD name=\"{col}\" datatype=\"{dtype}\" ucd=\"pos.eq.ra\" unit=\"deg\"/>\n"

        elif col == dec_col:
            field += f"\t\t\t<FIELD name=\"{col}\" datatype=\"{dtype}\" ucd=\"pos.eq.dec\" unit=\"deg\"/>\n"

        elif col == dist_col:
            field += f"\t\t\t<FIELD name=\"{col}\" datatype=\"{dtype}\" ucd=\"pos.distance\" unit=\"pc\"/>\n"

        else:
            field += f"\t\t\t<FIELD name=\"{col}\" datatype=\"{dtype}\"/>\n"

    votable_xml += f"""{field}\t\t\t<DATA>
\t\t\t\t<TABLEDATA>
"""
    # print(mini_df)
    for i in range(len(mini_df)):
        votable_xml += "\t\t\t\t\t<TR>\n"
        # print()
        for col in mini_df.columns:
            # print(i, col)
            votable_xml += f"\t\t\t\t\t\t<TD>{mini_df.loc[i, col]}</TD>\n"
        votable_xml += "\t\t\t\t\t</TR>\n"

    votable_xml += f"""\t\t\t\t</TABLEDATA>
\t\t\t</DATA>
\t\t</TABLE>
\t</RESOURCE>
</VOTABLE>"""

    with open('temp_VOTable.vot', 'w') as f:
        f.write(votable_xml)

SW_SHOWMINIMIZED = 2
CREATE_NEW_CONSOLE = 0x00000010

si = subprocess.STARTUPINFO()
si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
si.wShowWindow = SW_SHOWMINIMIZED

def generate_dsa(mini_df, fileName, ra_col, dec_col, dist_col, si=si):
    makeVOTable(mini_df, ra_col, dec_col, dist_col)

    planetTypesInMini_df = mini_df["planetType"].drop_duplicates().tolist()

    colors = ''
    for i in range(len(planetTypesInMini_df)):
        colors += f'{round(planetTypeColors[planetTypesInMini_df[i]]['red'] * 255)} {round(planetTypeColors[planetTypesInMini_df[i]]['green'] * 255)} {round(planetTypeColors[planetTypesInMini_df[i]]['blue'] * 255)}\n'

    #xml files to build into DSA
    #lineBreak
    #name of ourput file (no extension)
    #Change position?
    #change distance?
    #Omit Distance for empty values?
    #Default distance for empty distance values?
    #Assign color?
    #which column should be used for color [0-n)
    #colors for the values within the above chosen column|color for the empty/out-of-range entries
    #Assign point size?
    #Create Label Files?
    #done

    answers = f'''temp_VOTable.vot

{fileName}
N
N
N
10 pc
y
10
{colors}0 0 0
N
N'''
    
    subprocess.run(
        [r'C:\D7Software\Utilities\VOTableToDSA\VOTableToDSA.exe'],
        input=answers,
        text=True,
        creationflags=CREATE_NEW_CONSOLE,
        startupinfo=si
    )
    shutil.move(fileName + '.dsa', os.path.join(dsaDestination, fileName + '.dsa'))
    os.remove('temp_VOTable.vot')

def makeDS_prepObject(objectName, modelName, modelLocation=dsaDestination, startSize=15):
    lines = [
        f'\t{objectName} is dsAtlasClass\n',
        f'\t{objectName} model {os.path.join(modelLocation, modelName + '.dsa')}\n',
        f'\t{objectName} size {startSize}\n',
        f'\t{objectName} intensity 0\n',
        f'\tscene add {objectName}\n',
        '\n'
    ]

    return lines

def makeDS_actionObject(objectName, gasCount, nepCount, supCount, terCount, year, pauseTime=timePerMonth, endSize=4, fadeDownDuration=sustainTime):

    if objectName == None:
        lines = [
            f'\tyear text "{year}"\n',
            '\n',
            f'+{pauseTime}\n'
        ]

    else:
        lines = [
            f'\t{objectName} intensity 100\n',
            f'\t{objectName} size {endSize} duration {fadeDownDuration}\n',
            f'\tgasGiantCounter text "Gas Giants: {gasCount}"\n',
            f'\tneptunianCounter text "Neptunians: {nepCount}"\n',
            f'\tsuperEarthsCounter text "Super Earths: {supCount}"\n',
            f'\tterrestrialCounter text "Terrestrials: {terCount}"\n',
            f'\ttotal text "Total: {gasCount + nepCount + supCount + terCount}"\n',
            f'\tyear text "{year}"\n',
            '\n',
            f'+{pauseTime}\n'
        ]

    return lines


# write the beginning of the ds script. This is a giant pain in the ass to type out, but is probably the most efficient in the long rung
#there will be a second variable that will be the actionable of the script later on
dsScript = [
    '0:00\n',
	'\t#prepare the domeAudio\n',
	f'\tdomeAudio path ..\\audio\\{wavFile}\n',
	'\tdomeAudio volume 80\n',
	'\tdome add domeAudio\n',
	'\n',
    '\t#define the different counters for each observation method\n',
	'\tgasGiantCounter is textClass\n',
	'\tgasGiantCounter position spherical -37 10 10 m\n',
	'\tgasGiantCounter intensity 0\n',
	f'\tgasGiantCounter color {planetTypeColors["Gas Giants"]["red"] * 100} {planetTypeColors["Gas Giants"]["green"] * 100} {planetTypeColors["Gas Giants"]["blue"] * 100}\n',
	'\tgasGiantCounter origin "center"\n',
	'\tgasGiantCounter vOrigin "center"\n',
	'\tgasGiantCounter alignment "center"\n',
	'\tgasGiantCounter resolution "high"\n',
	'\tgasGiantCounter text "Gas Giants: 0"\n',
    '\tgasGiantCounter outline on\n',
	'\tgasGiantCounter outlineWidth 1\n',
	'\tscene add gasGiantCounter near\n',
	'\n',
	'\tneptunianCounter is gasGiantCounter\n',
	'\tneptunianCounter position spherical -12.1 10 10 m\n',
	f'\tneptunianCounter color {planetTypeColors["Neptunian"]["red"] * 100} {planetTypeColors["Neptunian"]["green"] * 100} {planetTypeColors["Neptunian"]["blue"] * 100}\n',
	'\tneptunianCounter resolution "high"\n',
	'\tneptunianCounter text "Neptunians: 0"\n',
	'\tscene add neptunianCounter near\n',
	'\n',
	'\tsuperEarthsCounter is gasGiantCounter\n',
	'\tsuperEarthsCounter position spherical 13.35 10 10 m\n',
	f'\tsuperEarthsCounter color {planetTypeColors["Super Earths"]["red"] * 100} {planetTypeColors["Super Earths"]["green"] * 100} {planetTypeColors["Super Earths"]["blue"] * 100}\n',
	'\tsuperEarthsCounter resolution "high"\n',
	'\tsuperEarthsCounter text "Super Earths: 0"\n',
	'\tscene add superEarthsCounter near\n',
	'\n',
	'\tterrestrialCounter is gasGiantCounter\n',
	'\tterrestrialCounter position spherical 37 10 10 m\n',
	f'\tterrestrialCounter color {planetTypeColors["Terrestrial"]["red"] * 100} {planetTypeColors["Terrestrial"]["green"] * 100} {planetTypeColors["Terrestrial"]["blue"] * 100}\n',
	'\tterrestrialCounter resolution "high"\n',
	'\tterrestrialCounter text "Terrestrials: 0"\n',
	'\tscene add terrestrialCounter near\n',
	'\n',
    '\ttotal is gasGiantCounter\n',
	'\ttotal text "Total: 0"\n',
	'\ttotal position spherical 0 16.5 10 m\n',
	'\ttotal color white\n',
	'\ttotal textScale 1.25\n',
	'\tscene add total near\n',
    '\n',
	'\t#define the year counter\n',
	'\tyear is gasGiantCounter\n',
	'\tyear position spherical 0 24.04 10 m\n',
	'\tyear textScale 1.5\n',
	'\tyear color white\n',
	'\tyear resolution "high"\n',
	f'\tyear text "{df["disc_pubdate"].iloc[0].split("-")[0]}"\n',
	'\tscene add year near\n',
	'\n',
    '+3\n',
	'\t#bring up intensity\n',
	'\tneptunianCounter intensity 100 duration 1\n',
	'\tgasGiantCounter intensity 100 duration 1\n',
	'\tsuperEarthsCounter intensity 100 duration 1\n',
	'\tterrestrialCounter intensity 100 duration 1\n',
    '\ttotal intensity 100 duration 1\n',
	'\tyear intensity 100 duration 1\n',
    '\n',
    '+1\n'
    ]

dsAction = [
    '+3\n',
    '\tdomeAudio play\n',
    '\n'
]




#There are some data points that don't have the data that I need, even when trying to infer the data. This is the variable
#that stores the indecies that don't have data points. We'll deal with them later *incert ominous music*
indeciesToEdit = []


#begin writing vla file we will define the first file outright before the loop to establish variables to compare to

#begin the file counter. This will be appended to the vla file name with 0's padded
fileCount = 0
lastDate = currentDate
currentTimeMedium = 0

gasGiantCount = 0
neptunianCount = 0
superEarthCount = 0
terrestrialCount = 0

lengthCheck = 0

currentBin = 0

for i in tqdm(range(len(df))):
    #figure out the planet type
    planetType = getPlanetType(df.loc[i, 'pl_bmassj'])
    df.loc[i, 'planetType'] = planetType

    if planetType == 'Gas Giants':
        gasGiantCount += 1
    elif planetType == 'Neptunian':
        neptunianCount += 1
    elif planetType == 'Super Earths':
        superEarthCount += 1
    else:
        terrestrialCount += 1

    #if the first data point has a month of "00", then subtract the year by 1 and make the month "12"
    if "-00" in df['disc_pubdate'].iloc[i]:
        df.loc[i, 'disc_pubdate'] = str(int(df.loc[i, 'disc_pubdate'].split('-')[0]) - 1) + '-12'
    
    currentDate = df.loc[i, 'disc_pubdate']

    #if there is no period, then generate a period with Kepler's third law
    if df.loc[i, 'pl_orbper'] == 0 and df.loc[i, 'pl_bmassj'] != 0:
        df.loc[i, 'pl_orbper'] = generatePeriod(df.loc[i, 'pl_orbsmax'], df.loc[i, 'pl_bmassj'], (df.loc[i, 'st_mass'] * u.M_sun).to('M_jup').value) #masses must be in M_jup
    
    #if the above statement failed, then add the index to the list
    if df.loc[i, 'pl_orbper'] == 0:
        indeciesToEdit.append(i)

    if currentDate == lastDate:
        df.loc[i, 'timeMedium'] = currentTimeMedium

    else:
        lastYear = int(lastDate.split('-')[0])

        fileName = f'{dsaFileName}_{fileCount:05}'

        df_lastDate = df.loc[df['disc_pubdate'] == lastDate].reset_index(drop=True)

        # print(df_lastDate)
        generate_dsa(df_lastDate, fileName, 'ra', 'dec', 'sy_dist')
        lengthCheck += len(df_lastDate)

        for j in range(binSize - 1):
            notesPlayedByBin[j] = notesPlayedByBin[j+1]
        notesPlayedByBin[-1] = len(df_lastDate)
        NotesPlayedAtCurrentTime = sum(notesPlayedByBin)

        df.loc[df['disc_pubdate'] == lastDate, 'numberOfNotesPlayed'] = NotesPlayedAtCurrentTime

        dsScript += makeDS_prepObject(f'exoplanets_{lastDate}', fileName)
        dsAction += makeDS_actionObject(f'exoplanets_{lastDate}', gasGiantCount, neptunianCount, superEarthCount, terrestrialCount, lastYear)

        fileCount += 1
        
        currentYear = int(currentDate.split('-')[0])

        lastMonth = int(lastDate.split('-')[1])
        currentMonth = int(currentDate.split('-')[1])

        currentTimeMedium += (((currentYear * 12) + currentMonth) - ((lastYear * 12) + lastMonth)) * timePerMonth
        df.loc[i, 'timeMedium'] = currentTimeMedium

        
        imonth = lastMonth
        iyear = lastYear
        
        if imonth + 1 == 13:
            imonth = 1
            iyear += 1
        
        else:
            imonth += 1

        while (iyear, imonth) != (currentYear, currentMonth):
            dsAction += makeDS_actionObject(None, 0, 0, 0, 0, iyear)
            for j in range(binSize - 1):
                notesPlayedByBin[j] = notesPlayedByBin[j+1]
            notesPlayedByBin[-1] = 0

            if imonth + 1 == 13:
                imonth = 1
                iyear += 1
            
            else:
                imonth += 1

    lastDate = currentDate




# --- Now process the final date group ---
df_lastDate = df.loc[df['disc_pubdate'] == lastDate].reset_index(drop=True)
lastYear = int(lastDate.split('-')[0])

fileName = f'{dsaFileName}_{fileCount:05}'

generate_dsa(df_lastDate, fileName, 'ra', 'dec', 'sy_dist')
lengthCheck += len(df_lastDate)

for j in range(binSize - 1):
    notesPlayedByBin[j] = notesPlayedByBin[j+1]
notesPlayedByBin[-1] = len(df_lastDate)
NotesPlayedAtCurrentTime = sum(notesPlayedByBin)

df.loc[df['disc_pubdate'] == lastDate, 'numberOfNotesPlayed'] = NotesPlayedAtCurrentTime


dsScript += makeDS_prepObject(f'exoplanets_{lastDate}', fileName)
dsAction += makeDS_actionObject(f'exoplanets_{lastDate}', gasGiantCount, neptunianCount, superEarthCount, terrestrialCount, lastYear)


print(lengthCheck)

df['velocity'] = df['numberOfNotesPlayed'].apply(lambda x: (1/x)**0.2 if x != 0 else 0)
df['velocity'] = (df['velocity'] - df['velocity'].min()) / (df['velocity'].max() - df['velocity'].min())

print(df['numberOfNotesPlayed'])

# import matplotlib.pyplot as plt
# plt.figure()
# plt.scatter(df['timeMedium'],df['velocity'])
# plt.show()

# sys.exit(0)

dsScript += dsAction




mean = df.loc[df['pl_orbper'] != 0, 'pl_orbper'].mean()

for idx in indeciesToEdit:
    df.loc[idx, 'pl_orbper'] = mean

df['frequency'] = 1/df['pl_orbper']
df['scaledFrequency'] = scaleFrequency(df['frequency'], min(df['frequency']))










outdir = Path("", "data", "samples", "soundfonts")

if list(Path(f"{outdir}").glob("*.sf2")):
    print(f"Directory {outdir} with sf2 files already exists.")
else:
    print("Downloading files...")

    path = Path(outdir)
    path.mkdir(parents=True, exist_ok=True)
    path = str(path)
    # path = os.path.realpath(outdir)

    files = ("organ.sf2",)
    urls = ("https://huggingface.co/datasets/projectlosangeles/soundfonts4u/resolve/main/Guitars-Universal-V1.5.sf2",)
    for f, u in zip(files, urls):
        with urllib.request.urlopen(u) as response, Path(f"{path}",f"{f}").open(mode='wb') as out_file:
            print(f"\t getting {f}")
            data = response.read() # a `bytes` object
            out_file.write(data)
    print("Done.")





eGuitar_sampler = Sampler(Path(outdir,"eguitar.sf2"), sf_preset=31)
sonificationTime = df.loc[len(df) - 1, 'timeMedium']




generator = copy.copy(eGuitar_sampler)



score =  Score(notes, sonificationTime+sustainTime)


maps = {
    'pitch':df['scaledFrequency'],
    'time': df['timeMedium'],
    'volume': df['velocity']
}

system = "5.1"


lims = {
    'time': ('0%',f'{100*((sonificationTime+sustainTime)/sonificationTime)}%'),
    'pitch': ('0%','100%'),
    'volume': [0, 1]
}

# set up source
sources = Events(maps.keys())
sources.fromdict(maps)
sources.apply_mapping_functions(map_lims=lims)

# manually set note properties to get a suitable sound
generator.modify_preset({
    'note_length':sustainTime, # hold each note for n seconds or 30 ms - what if this was 1s?
    'volume_envelope': {
        'use':'on',
        # A,D,R values in seconds, S sustain fraction from 0-1 that note
        # will 'decay' to (after time A+D)
        'A':0.01,    # ✏️ Time to fade in note to maximum volume, using 10 ms
        'D':2,     # ✏️ Time to fall from maximum volume to sustained level (s), irrelevant while S is 1
        'S':1,      # ✏️ fraction of maximum volume to sustain note at while held, 1 implies 100%
        'R':0.05     # ✏️ Time to fade out once note is released, using 100 ms
        }
})



# soni = Sonification(score, sources, generator, system)
# soni.render()
# soni.save(os.path.join(audioDestination, wavFile))



with open(os.path.join(scriptDestination, dsFileName), 'w') as f:
    for line in dsScript:
        f.write(line)



#Stop timing the code
tf = time.time()

#calculate runtime and print it to the reader.
run_time = tf-t0
print()
print (f"code took {int(run_time/60)} minutes and {((run_time/60)-int(run_time/60))*60:.1f} seconds") #should be around 15 - 20s