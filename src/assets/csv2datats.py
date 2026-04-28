import pandas as pd

# File paths
input_1_csv = "sukanya-data/atnf-2_51.csv"
input_2_csv = "sukanya-data/sukanya-pulsars.csv"
input_3_csv = "sukanya-data/DWD.csv"
input_4_csv = "sukanya-data/EB.csv"
input_5_csv = "sukanya-data/EPRV.csv"
output_ts = "data.ts"

# Read the CSV files into DataFrames
df1 = pd.read_csv(input_1_csv)
df2 = pd.read_csv(input_2_csv)
df3 = pd.read_csv(input_3_csv)
df4 = pd.read_csv(input_4_csv)
df5 = pd.read_csv(input_5_csv)

# Sort by 'DIST'
df1 = df1.sort_values(by="DIST")
df2 = df2.sort_values(by="DIST")
df3 = df3.sort_values(by="DIST")
df4 = df4.sort_values(by="DIST")
df5 = df5.sort_values(by="DIST")

# Convert distances to parsecs
df1["DIST"] = df1["DIST"] * 1000
df2["DIST"] = df2["DIST"] * 1000
df3["DIST"] = df3["DIST"] * 1000
df4["DIST"] = df4["DIST"] * 1000

# Count sources with invalid distances
invalid_dist_mask = (df1["DIST"] == 0) | (df1["DIST"].isna()) | (df1["DIST"] == "*")
invalid_count = invalid_dist_mask.sum()

# Remove sources with invalid distances
df1 = df1[~invalid_dist_mask]

print(f"Removed {invalid_count} sources with invalid distances from ATNF catalog.")

# Update Catalog column
df1["Catalog"] = "ATNF_2_51_CSV"
df2["Catalog"] = df2["Catalog"].astype(str).replace({
    '1': 'BINARY_PULSARS_I_CSV',
    '2': 'BINARY_PULSARS_II_CSV',
    '3': 'SINGLE_PULSARS_CSV'
})
df3["Catalog"] = "DOUBLE_WHITE_DWARVES_CSV"
df4["Catalog"] = "ECLIPSING_BINARIES_CSV"
df5["Catalog"] = "EXTREME_PRECISION_RADIAL_VELOCITY_CSV"

# Combine all DataFrames
combined_df = pd.concat([df1, df2, df3, df4, df5])

# Define the desired order of catalogs
ordered_catalogs = [
    "ATNF_2_51_CSV",
    "BINARY_PULSARS_I_CSV",
    "BINARY_PULSARS_II_CSV",
    "SINGLE_PULSARS_CSV",
    "ECLIPSING_BINARIES_CSV",
    "DOUBLE_WHITE_DWARVES_CSV",
    "EXTREME_PRECISION_RADIAL_VELOCITY_CSV"
]

# Create the TypeScript export statements in the specified order
with open(output_ts, "w") as ts_file:
    for catalog in ordered_catalogs:
        group = combined_df[combined_df["Catalog"] == catalog]
        
        # Convert group to CSV string
        csv_content = group.to_csv(
            index=False,
            header=True,
            columns=["NAME", "RA", "DEC", "DIST", "Catalog"],
            lineterminator="\n"  # Prevent extra newlines
        ).strip()
        
        # Write the export statement
        ts_file.write(f"export const {catalog} = `{csv_content}`;\n\n")

print(f"Data successfully exported to {output_ts}")
