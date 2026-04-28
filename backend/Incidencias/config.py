from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    EMAIL_FROM: str
    EMAIL_PASSWORD: str
    EMAIL_RESPONSABLE: str

    class Config:
        env_file = ".env"

settings = Settings()