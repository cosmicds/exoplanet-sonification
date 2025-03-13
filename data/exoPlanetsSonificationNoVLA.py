'''
script:     exoPlanetSonification.py
author:     Alex Shepard
date:       1/29/2025
Purpose:    create vla's and a wav file for an exoplanet sonification

Plan:       This python script is designed to setup the later javascript in digistar for sucess.
    The plan is to write a javascript for each month an exoplanet is observed. sometimes there will be one
    datapoint in the vla, sometimes there will be a few hundred. The later javascript will load all of the
    vla's as dotModelClass's and turn them on at the correct time while the audio (generated from this script)
    is played. If successful, it will look something like this within digistar: https://www.youtube.com/embed/OOwI3nTAHIc

Description:    This script is broken down into 3 parts: writing the vla's', prepping wav file variables, and writing the wav file.
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
import soundfile as sf
from astropy.io import ascii
import os
from astropy import constants as const
from astropy import constants as u
from pydub import AudioSegment
import time


#Start timing the code
t0 = time.time()



#define final file names
# vlaFileName = 'exoplanetSonification' #this is the prefix of the file names for the vla. it will be counted and padded with zeros + ".vla"
textFileName = 'exoplanetSonificationList.txt'
wavFile = 'exoplanetSonification.wav'




######################################### Write the vla's #################################################



# https://exoplanetarchive.ipac.caltech.edu/docs/counts_detail.html download all exoplanets tabel ordered by "Discovery Publication Date"
file = 'PS_2025.03.10_08.42.21.csv'

#read the csv into an astropy table
tbl = ascii.read(file)

# fill all mased values with 0
tbl = tbl.filled(0)

# # define a light year and a parsec in meters as defined by digistar. This will be needed in creating the vla's
# ly = 9460730472580000 #meters
# pc = 30856775812800000 #meters

# # Define the custom 10-row header
# header = [
#     "set intensity EXPLICIT",
#     "set parametric NON_PARAMETRIC",
#     "set filecontent DOTS",
#     "set filetype New",
#     "set depthcue 0",
#     "set defaultdraw stellar",
#     "set coordsys RIGHT",
#     "set author Alex Shepard",
#     "set site U.S. Space & Rocket Center",
#     "set comment Exoplanet sonification"
# ]


# #define color values as a rgb percent
# red = 1
# green = 1
# blue = 1

#define counters for different observation methods
rvelocityCount = 0
transitCount = 0
imagingCount = 0
microlensingCount = 0
timingCount = 0
orbitalCount = 0
astrometryCount = 0
diskCount = 0

#There are some data points that don't have the data that I need, even when trying to infer the data. This is the variable
#that stores the indecies that don't have data points. We'll deal with them later *incert ominous music*
indeciesToEdit = []

#define the date currently being applied to the vla
currentMonth = tbl['disc_pubdate'][0]

#Some data points dont have period, but they do have variables that complete Kepler's thrid law
#this definition returns a period infered from that law. If the required variables are not met, then concede and let it be 0
def generatePeriod(a, m, M): #masses must be in M_jup

    if a == 0 or m == 0 or M == 0:
        return 0

    else:
        return (((4*np.pi)/(const.G.to('au**3/(M_jup*day**2)').value * (M + m))) * a**3)**(1/2)


#begin writing vla file we will define the first file outright before the loop to establish variables to compare to

#begin the file counter. This will be appended to the vla file name with 0's padded
fileCount = 0

# #begin writing the first vla file as well as a text file that 
# f = open(vlaFileName + f'{fileCount:05}.vla', "w")

# # write the header
# for text in header:
#     f.write(text)
#     f.write("\n")
    
# #add in a comment for which file this pertains to
# f.write(f'set comment for {tbl["disc_pubdate"][0]}')
# f.write("\n")

# #figure out the cartesian coordinates from the given celestial coordinates
# x = pc * tbl['sy_dist'][0]*np.cos(np.deg2rad(tbl['dec'][0])) * np.cos(np.deg2rad(tbl['ra'][0]))
# y = pc * tbl['sy_dist'][0]*np.cos(np.deg2rad(tbl['dec'][0])) * np.sin(np.deg2rad(tbl['ra'][0]))
# z = pc * tbl['sy_dist'][0]*np.sin(np.deg2rad(tbl['dec'][0]))


# ### This next section will determine the observation method and by extension, the color to be associated with it
# if "Timing" in tbl['discoverymethod'][0]:
#     timingCount +=1

#     #red
#     red = 1
#     green = 0
#     blue = 0

# elif tbl['discoverymethod'][0] == 'Radial Velocity':
#     rvelocityCount +=1

#     #light red
#     red = 1
#     green = 0.5
#     blue = 0.5

# elif tbl['discoverymethod'][0] == 'Transit':
#     transitCount+=1

#     #purple (best color)
#     red = 0.627
#     green = 0.125
#     blue = 0.941

# elif tbl['discoverymethod'][0] == 'Imaging':
#     imagingCount += 1

#     #yellow
#     red = 1
#     green = 1
#     blue = 0

# elif tbl['discoverymethod'][0] == 'Microlensing':
#     microlensingCount += 1

#     #cyan
#     red = 0
#     green = 1
#     blue = 1

# elif tbl['discoverymethod'][0] == 'Orbital Brightness Modulation':
#     orbitalCount += 1

#     #light yellow
#     red = 1
#     green = 1
#     blue = 0.5

# elif tbl['discoverymethod'][0] == 'Astrometry':
#     astrometryCount +=1

#     #grey
#     red = 0.7
#     green = 0.7
#     blue = 0.7

# elif tbl['discoverymethod'][0] == 'Disk Kinematics':
#     diskCount += 1

#     #light cyan
#     red = 0.5
#     green = 1
#     blue = 1

# #if none of these, then either something went wrong or a new observation method was used and the code needs to be updated
# else:

#     #white
#     red = 1
#     green = 1
#     blue = 1

#     print(f"something went wrong at {tbl['pl_name'][0]} which has {tbl['discoverymethod'][0]}")

# #write the first datapoint of the first vla file. the positional data needs to be divided by a digistar ly because digistar is cringe
# #Also add a comment showing the discovery method
# f.write(f"D {x/ly} {y/ly} {z/ly} 1 {red} {green} {blue} 1 #{tbl['discoverymethod'][0]}")
# f.write("\n")

#if the first data point has a month of "00", then subtract the year by 1 and make the month "12"
if "-00" in tbl['disc_pubdate'][0]:
    tbl['disc_pubdate'][0] = str(int(tbl['disc_pubdate'][0].split('-')[0]) - 1) + '-12'

#if there is no period, then generate a period with Kepler's third law
if tbl['pl_orbper'][0] == 0:
    tbl['pl_orbper'][0] = generatePeriod(tbl['pl_orbsmax'][0], tbl['pl_bmassj'][0], (tbl['st_mass'][0] * u.M_sun).to('M_jup').value) #masses must be in M_jup

#if the above statement failed, then add the index to the list
if tbl['pl_orbper'][0] == 0:
    indeciesToEdit.append(0)


#loop through the rest of the data points in the table
for j in range(1, len(tbl) - 1):
    
    #change the date if the date is bad
    if "-00" in tbl['disc_pubdate'][j]:
        tbl['disc_pubdate'][j] = str(int(tbl['disc_pubdate'][j].split('-')[0]) - 1) + '-12'
        
    #if the date has changed, then we need to close the vla file and open the next one.
    if tbl['disc_pubdate'][j] != currentMonth:
        
        # #close the old file
        # f.close()
        
        #update the currently use month for the vla
        currentMonth = tbl['disc_pubdate'][j]
        
        #update the file count for the vla file name
        fileCount += 1
        
        # #begin writing a new vla file
        # f = open(vlaFileName + f'{fileCount:05}.vla', "w")
        
        # # write the header
        # for text in header:
        #     f.write(text)
        #     f.write("\n")
        
        # # write a new comment telling the reader which date this file is for
        # f.write(f'set comment for {tbl["disc_pubdate"][j]}')
        # f.write("\n")
        
    # #define the cartesian coordinates from the given celestial coordinates
    # x = pc * tbl['sy_dist'][j]*np.cos(np.deg2rad(tbl['dec'][j])) * np.cos(np.deg2rad(tbl['ra'][j]))
    # y = pc * tbl['sy_dist'][j]*np.cos(np.deg2rad(tbl['dec'][j])) * np.sin(np.deg2rad(tbl['ra'][j]))
    # z = pc * tbl['sy_dist'][j]*np.sin(np.deg2rad(tbl['dec'][j]))


    # #same as above
    # if "Timing" in tbl['discoverymethod'][j]:
    #     timingCount +=1

    #     red = 1
    #     green = 0
    #     blue = 0

    # elif tbl['discoverymethod'][j] == 'Radial Velocity':
    #     rvelocityCount +=1

    #     red = 1
    #     green = 0.5
    #     blue = 0.5

    # elif tbl['discoverymethod'][j] == 'Transit':
    #     transitCount+=1
    
    #     red = 0.627
    #     green = 0.125
    #     blue = 0.941

    # elif tbl['discoverymethod'][j] == 'Imaging':
    #     imagingCount += 1

    #     red = 1
    #     green = 1
    #     blue = 0

    # elif tbl['discoverymethod'][j] == 'Microlensing':
    #     microlensingCount += 1

    #     red = 0
    #     green = 1
    #     blue = 1

    # elif tbl['discoverymethod'][j] == 'Orbital Brightness Modulation':
    #     orbitalCount += 1

    #     red = 1
    #     green = 1
    #     blue = 0.5

    # elif tbl['discoverymethod'][j] == 'Astrometry':
    #     astrometryCount +=1

    #     red = 0.7
    #     green = 0.7
    #     blue = 0.7

    # elif tbl['discoverymethod'][j] == 'Disk Kinematics':
    #     diskCount += 1

    #     red = 0.5
    #     green = 1
    #     blue = 1

    # else:

    #     red = 1
    #     green = 1
    #     blue = 1

    #     print(f"something went wrong at {tbl['pl_name'][j]} which has {tbl['discoverymethod'][j]}")

    # #write the datapoint onto the vla file along with a comment showing the discovery method
    # f.write(f"D {x/ly} {y/ly} {z/ly} 1 {red} {green} {blue} 1 #{tbl['discoverymethod'][j]}")
    # f.write("\n")
        
    #if there is no perios, then infer one from Keplers 3rd law
    if tbl['pl_orbper'][j] == 0:
        tbl['pl_orbper'][j] = generatePeriod(tbl['pl_orbsmax'][j], tbl['pl_bmassj'][j], (tbl['st_mass'][j] * u.M_sun).to('M_jup').value) #masses must be in M_jup

    #if that failed, then add the index to the list
    if tbl['pl_orbper'][j] == 0:
        indeciesToEdit.append(j)
    
# #close the final file
# f.close()


########################################## end writing the vla files ################################################

####### begin setting up vairables for the wav file generation as well as the file for the javascript to read #######


### Now lets adjust some data points with undefined values

#figure out the average perod value
mean = np.mean(tbl['pl_orbper'][tbl['pl_orbper'] != 0]) #np.mean(np.array([x for x in tbl['pl_orbper'] if isinstance(x, (int, float))]))

#change all the values with no period to be the average period. Eccentially, this is a guess. You don't like it? tough!
for index in indeciesToEdit:
    tbl['pl_orbper'][index] = mean

#add a new column caled frequency which is onlt the inverse of the period
tbl['frequency'] = tbl['pl_orbper']**(-1)

#figure out the minimum frequency
f_min = np.min(tbl['frequency'])

### These data points will need to be asigned to a note of a specified scale depending on the orbital frequency. Since the current range
#is vey large and well outside of human ear range, not to mention that they aren't evenly distributed, we will need to do some data
#manipulation. All manipulation is done by using this paper as if it is the word of God:
#https://repository.gatech.edu/server/api/core/bitstreams/dac9bed7-3c20-4596-80e1-cc12cd61e487/content

#make a definition for scaled frequency determined by the paper. The paper doen't specify common or natural log, so comon log was assumed.
 #This could have also been done with f instead of (1/P) but I didn't do that so bite me!
def scaleFrequency(P):
    return np.log10((1/P)/f_min)**2

#generate a new column for the scaled frequency
tbl['scaled_frequency'] = scaleFrequency(tbl['pl_orbper'])

#define the finalList. this will be used to store only the variables that we care about. 
finalList = []

# begin writing the text file. This will be used by the javascript to now how and when to execute the digistar script
g = open(textFileName, 'w')

# loop through the range of the table length
for j in range(len(tbl)):

    #write the discovery publish dates and discovery method in the text file
    g.write(f"{tbl['disc_pubdate'][j]},{tbl['discoverymethod'][j]}")
    g.write("\n")

    #add only vlues that we care about to the list
    finalList.append([tbl['pl_name'][j], tbl['disc_pubdate'][j], tbl['ra'][j], tbl['dec'][j], tbl['scaled_frequency'][j]])

#The text file has been made. Close it.
g.close()

#update the reader of the process of the code
print("finalList created")


### Now let's initialize some variables for the sin wave generator

#define the notes that we will use. This is the Emaj13 scale. It has the note name, frequency number, and the midi number
notes = [['E1', 41.2, 28], ['E2', 82.41, 40], ['E3', 164.81, 52], ['Ab3', 207.65, 56], ['B3', 246.94, 59],
         ['Eb4', 311.13, 63], ['E4', 329.63, 64], ['Ab4', 415.3, 68], ['B4', 493.88, 71], ['Db5', 554.37, 73],
         ['Eb5', 622.25, 75], ['Gb5', 740.0, 78], ['Ab5', 830.61, 80], ['B5', 987.77, 83], ['Db6', 1108.73, 85],
         ['Eb6', 1244.51, 87], ['Gb6', 1480.0, 90], ['Ab6', 1661.22, 92], ['B6', 1975.53, 95], ['Db7', 2217.46, 97],
         ['Eb7', 2489.02, 99], ['Gb7', 2960.0, 102], ['Ab7', 3322.44, 104]]

#define the previous date
lastDate = tbl['disc_pubdate'][0]

#define music as an empty list. This will be the "script music"
music = []

#ask the author how many seconds per month the author wants
timePerMonth = 0.25 #float(input("How many seconds per month do you want? (recommended 0.25, paper uses 0.17) "))  #s

#figure out the interval to fifure out where to place the borders
interval = (np.max(tbl['scaled_frequency']) - np.min(tbl['scaled_frequency'])) / (len(notes))

#make the interval list
intervalList = [np.min(tbl['scaled_frequency'])]
for i in range(len(notes) - 1):
    intervalList.append(intervalList[i] + interval)


#define some variables
v_min = 45
v_max = 127
v_boost = 20

m_min = notes[0][2]
m_max = notes[len(notes) - 1][2]

#Sometimes the same note will be played as many times as 241 at once. To control this, we only need
#to play the note once but just louder than the rest depending on how many times it should have been played.
#We do this by making a definition that figures out the velocity of the note depending on how many times it would
#have been played
def generateVelocity(N_f, m, m_min, m_max):
    m_tilda = (m_max - m)/(m_max - m_min)
    N_f_max = v_min + m_tilda * v_boost

    return v_min + (v_max - v_min) * (((N_f - 1)/(N_f_max - 1))**(1/2)) + (m_tilda * v_boost)


# [tbl['pl_name'][j], tbl['disc_pubdate'][j], tbl['ra'][j], tbl['dec'][j], tbl['scaled_frequency'][j]]

#define a frequency list that will hold all of the designated notes to be played in a certain month.
#This will be a matrix of the note frequency, number of times the note should be played at once, and the midi number
frequencyList = []

#define an initial delay time before the music actually starts
delayTime = 1

#loop through the finla list
for i, value in enumerate(finalList):

    #if the month changed, then do the following
    if value[1] != lastDate:
        
        #loop through the values that we accumulated in the frequency list for the previous month
        for freqCounter in frequencyList:
            
            #figure out the varables
            N_f = freqCounter[1]
            m = freqCounter[2]
            
            #figure out the frequency of the note as well as the velocity
            velocity = generateVelocity(N_f, m, m_min, m_max)
            noteFrequency = freqCounter[0]
            
            #add music note to list
            music.append((delayTime, noteFrequency, velocity))

        #figure out the previus date and the current date
        lastDateAsNumber = float(finalList[i-1][1].split('-')[0]) * 12 + float(finalList[i-1][1].split('-')[1])
        dateAsNumber = float(value[1].split('-')[0]) * 12 + float(value[1].split('-')[1])

        #add a delay time as the months tick by
        delayTime += (dateAsNumber - lastDateAsNumber) * timePerMonth

    #if the month didn't change, initiallize the frequency list
    else:
        frequencyList = []


    #loop through the intervalList
    for j, scaledValue in enumerate(intervalList):

        #if the scaled frequency is less than the interval value, then make that the frequency
        if value[4] <= scaledValue:
            noteFrequency = notes[j][1] #frequency
            # noteFrequency = notes[j][0] #note name
            m = notes[j][2]

            #initiallize add2list
            add2list = True
            
            #loop throug the current frequency list and check if this frequency is already there. If so, then don't add to list
            for k in frequencyList:
                if noteFrequency == k:
                    add2list = False
                    
            #break the j loop
            break
    
    #check if I can add the note to music and do so if allowed
    if add2list == True:
        frequencyList.append([noteFrequency, 1, m])

    #If I can't add the not to music and we are still on the same month as before, then do the following
    if add2list == False and value[1] == lastDate:
        
        # figure out wher the note should be played and add 1 to the values standing for number of times the note should be played
        for j, freqCounter in enumerate(frequencyList):
            if freqCounter[0] == noteFrequency:
                frequencyList[j][1] += 1
                
                #break the j loop
                break
        
        #continue the i loop
        continue

    #update the lastDate variable
    lastDate = value[1]

    
#Generate the music note for the last month
for freqCounter in frequencyList:
    N_f = freqCounter[1]
    m = freqCounter[2]
    velocity = generateVelocity(N_f, m, m_min, m_max)
    noteFrequency = freqCounter[0]

    music.append((delayTime, noteFrequency, velocity))

#update the reader
print("music is written")


#################################################### End wav file prep##############################################



############################################## begin writing the wave file #########################################


'''
### note recording sticher (Incomplete!!!!!!)


def load_aiff(note, aiff_folder):
    """Load a specific .aiff file for the note."""
    note_filename = f"Piano.mf.{note}.aiff"
    note_filepath = os.path.join(aiff_folder, note_filename)
    if os.path.exists(note_filepath):
        return AudioSegment.from_file(note_filepath, format="aiff")
    else:
        raise FileNotFoundError(f"{note_filename} not found in {aiff_folder}")

def generate_audio(music, aiff_folder, output_wav):
    """Generate a wav file by stitching together AIFF notes, allowing simultaneous notes."""
    final_audio = AudioSegment.silent(duration=0)  # Start with a silent track
    active_notes = []  # List to hold active notes to mix

    # Start at the first note
    current_time = 0  # in milliseconds

    for delay, note_name, velocity in music:
        # Load the audio for the current note
        note_audio = load_aiff(note_name, aiff_folder)
        
        # Adjust the volume based on velocity
        note_audio = note_audio + velocity
        
        # Set the start time for this note
        note_start_time = current_time + delay * 1000  # delay is in seconds, so convert to ms

        # Add the note to the active notes at the correct time
        active_notes.append((note_audio, note_start_time))
        
        # Update current_time to include the delay
        current_time += delay * 1000  # in milliseconds

    # Mix all active notes at the same time
    for note_audio, note_start_time in active_notes:
        # Overlay the note_audio at its start_time on the final_audio
        final_audio = overlay_audio(final_audio, note_audio, note_start_time)

    # Export the final audio to a .wav file
    final_audio.export(output_wav, format="wav")

def overlay_audio(base_audio, new_audio, start_time):
    """Overlay new_audio onto base_audio at the specified start_time."""
    if start_time < len(base_audio):
        # If base_audio is longer than start_time, mix the new_audio at that point
        base_audio = base_audio[:start_time] + new_audio + base_audio[start_time + len(new_audio):]
    else:
        # If start_time is beyond the base_audio length, just append the new_audio
        base_audio = base_audio + AudioSegment.silent(duration=start_time - len(base_audio)) + new_audio
    return base_audio
'''
'''
# Example usage:
music = [
    (0.5, "A4", 80),  # A4, velocity 80, after 0.5 seconds
    (0.5, "C5", 100), # C5, velocity 100, after 0.5 seconds
    # Other notes here
]
'''
'''
aiff_folder = "C:\\D7Content\\User\\alex\\c&c\\soundsOfSpace\\scripts\\pianoRecordings"  # Path to your folder of .aiff files
output_wav = "pianoSonification_forRealz.wav"  # Output wav file path

generate_audio(music, aiff_folder, output_wav)
'''









### sin wave generator


# Constants
SAMPLE_RATE = 44100  # Samples per second (standard for audio)
DURATION = 0.3  # Duration of each note (this will be used as the main duration before decay kicks in)
DECAY_TIME = 5.0  # Decay time in seconds (how long the note fades after it is struck)
VELOCITY_SCALING = 0.3  # Velocity scaling factor (this can be adjusted to make notes louder/quieter)
MAX_VELOCITY = 127  # Maximum velocity (MIDI standard)

# Piano Timbre: Harmonics and their relative amplitudes
# The first number is the fundamental, followed by harmonics with decreasing amplitudes
AMPS = [0.5, 0.3, 0.2, 0.1, 0.05]  # Amplitudes for the fundamental + first few harmonics

# Function to generate a note with a piano-like timbre and decay
def generate_piano_tone(frequency, duration, decay_time, sample_rate, velocity):
    t = np.linspace(0, duration + decay_time, int(sample_rate * (duration + decay_time)))  # extended time for decay
    wave = np.zeros_like(t)
    
    # Apply fundamental and harmonics
    for i, harmonic in enumerate([1, 2, 3, 4, 5]):  # First few harmonics
        harmonic_wave = AMPS[i] * np.sin(2 * np.pi * harmonic * frequency * t)  # Harmonic wave
        wave += harmonic_wave
    
    # Apply decay envelope
    decay = np.exp(-t / (decay_time / 2))
    wave *= decay  # Apply the decay to the wave
    
    # Scale the amplitude based on velocity (MIDI velocity scaling)
    wave *= (velocity / MAX_VELOCITY) * VELOCITY_SCALING
    
    return wave

# Function to generate audio for multiple notes with overlap
def generate_audio_with_overlap(notes, sample_rate):
    # Create an empty array to hold the combined audio
    audio_data = np.zeros(int(sample_rate * (DURATION + DECAY_TIME)))  # Initial audio buffer size

    count = 1
    for note in notes:
        #print(f"{count}/{len(music)}")
        delay_time, frequency, velocity = note
        note_audio = generate_piano_tone(frequency, DURATION, DECAY_TIME, sample_rate, velocity)
        
        # Start the note at the correct time (apply delay based on when it is struck)
        start_idx = int(sample_rate * delay_time)  # Convert delay time to sample index
        if start_idx + len(note_audio) <= len(audio_data):
            audio_data[start_idx:start_idx + len(note_audio)] += note_audio
        else:
            # Extend the audio buffer if the note goes beyond the current buffer
            extended_audio = np.zeros(start_idx + len(note_audio))
            extended_audio[:len(audio_data)] = audio_data
            extended_audio[start_idx:start_idx + len(note_audio)] += note_audio
            audio_data = extended_audio

        count += 1

    return audio_data

'''
# Example: List of notes as (MIDI note, velocity, delay in seconds)
# MIDI note numbers: Middle C is 60, D4 is 62, E4 is 64, etc.
music = [
    (60, 100, 0),      # Middle C (C4), velocity 100, played immediately
    (64, 110, 0.5),    # E4, velocity 110, played after 0.5s
    (67, 120, 1),      # G4, velocity 120, played after 1s
    (72, 100, 1.5),    # C5, velocity 100, played after 1.5s
]
'''

# Generate the audio with overlapping notes
audio_data = generate_audio_with_overlap(music, SAMPLE_RATE)

# Save the audio to a file
sf.write(wavFile, audio_data, SAMPLE_RATE)

print(f"Audio saved to '{wavFile}'")



################################### end wave file ganerator #########################################

#Stop timing the code
tf = time.time()

#calculate runtime and print it to the reader.
run_time = tf-t0
print()
print (f"code took {int(run_time/60)} minutes and {((run_time/60)-int(run_time/60))*60:.1f} seconds") #sin generator method should be around 15s