from kaggle.api.kaggle_api_extended import KaggleApi
api = KaggleApi()
api.authenticate()
logs = api.kernels_output_cli("sparshsingh989/netra-clip-training", "kaggle_logs_v8")
print("Done")
