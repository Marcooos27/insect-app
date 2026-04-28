import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    EMAIL_FROM = os.getenv("EMAIL_FROM")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    EMAIL_RESPONSABLE = os.getenv("EMAIL_RESPONSABLE")

settings = Settings()