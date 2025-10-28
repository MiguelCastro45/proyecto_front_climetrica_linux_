import cdsapi

c = cdsapi.Client()

c.retrieve(
    'reanalysis-era5-single-levels',
    {
        "product_type": "reanalysis",
        "variable": ["2m_temperature", "total_precipitation", "volumetric_soil_water_layer_1"],
        "year": ["2025"],
        "month": ["10"],
        "day": ["22"],
        "time": ["00:00","06:00","12:00","18:00"],
        "format": "netcdf"
    },
    "climate_2025_10_26.nc"
)
