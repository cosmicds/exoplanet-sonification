import pandas as pd
from astropy.table import Table

# file paths
output_csv = "SRSC_unique_wwt.csv"
input_csv = "SRSC_distances.csv"

# read csv into df
df = pd.read_csv(input_csv)

# Select relevant columns for the smaller CSV
unique_columns = ["star_name", "Simbad_ID", "GaiaDR3_ID", "distance_pc", "ra_combined", "dec_combined", "Radio_freq_MHz", "Radio_telescope"]

# Drop duplicate rows based on unique identifiers
unique_sources_df = df[unique_columns] #.drop_duplicates(subset=["Simbad_ID", "GaiaDR3_ID"])

# Again, check for missing values in distance, ra, and dec
u_missing_distance = unique_sources_df["distance_pc"].isna().sum()
u_missing_ra = unique_sources_df["ra_combined"].isna().sum()
u_missing_dec = unique_sources_df["dec_combined"].isna().sum()

# Count rows where all three are missing
u_missing_all = unique_sources_df[unique_sources_df[["distance_pc", "ra_combined", "dec_combined"]].isna().all(axis=1)].shape[0]

# Print results
print(f"Number of unique sources missing distance: {u_missing_distance}")
print(f"Number of unique sources missing RA: {u_missing_ra}")
print(f"Number of unique sources missing Dec: {u_missing_dec}")
print(f"Number of unique sources missing all three: {u_missing_all}")

# Ensure ra_combined and dec_combined are numeric
unique_sources_df["ra_combined"] = pd.to_numeric(unique_sources_df["ra_combined"], errors="coerce")
unique_sources_df["dec_combined"] = pd.to_numeric(unique_sources_df["dec_combined"], errors="coerce")

# Create the new columns with the specified values
unique_sources_df["RA"] = unique_sources_df["ra_combined"]
unique_sources_df["DEC"] = unique_sources_df["dec_combined"]
unique_sources_df["Dist"] = unique_sources_df["distance_pc"]
unique_sources_df["Name"] = unique_sources_df["star_name"]
unique_sources_df["frequency"] = unique_sources_df["Radio_freq_MHz"]
unique_sources_df["observatory"] = unique_sources_df["Radio_telescope"]

# Select the final columns in the desired order
final_columns = ["Name", "RA", "DEC", "Dist", "frequency", "observatory"]
final_df = unique_sources_df[final_columns].sort_values(by="frequency", ascending=True)


# Save the smaller dataset to a CSV
final_df.to_csv(output_csv, index=False)
print(f"And look at that, here's the final dataset saved to: {output_csv}")

