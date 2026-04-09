from backend.database import get_connection
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

conn = get_connection()
cur = conn.cursor()

nueva_password = "adminMarcos"
nuevo_hash = pwd_context.hash(nueva_password[:72])


#AQUI PONGO EL EMAIL DEL QUE QUIERO CAMBIAR LA CONTRASEÑA
cur.execute(
    "UPDATE usuarios SET password_hash = %s WHERE email = %s",
    (nuevo_hash, "marcos@insecteat.es") 
)
conn.commit()
cur.close()
conn.close()
print("Contraseña actualizada")