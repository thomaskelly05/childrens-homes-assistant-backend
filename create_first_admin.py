import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt

DATABASE_URL = "postgresql://indicare_users_user:vj3Qo7qAYfXdJ1IOEsFeZTbX17tBeSJH@dpg-d6dfp4lm5p6s73fbj7lg-a.frankfurt-postgres.render.com/indicare_users"

def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def main():
    email = "admin@indicare.co.uk"      # you can change this if you like
    password = "ChangeMe123!"           # change this later in real life
    role = "admin"

    conn = get_db()
    cur = conn.cursor()

    hashed = hash_password(password)

    cur.execute("""
        INSERT INTO users (email, password_hash, role)
        VALUES (%s, %s, %s)
        ON CONFLICT (email) DO NOTHING;
    """, (email, hashed, role))

    conn.commit()
    cur.close()
    conn.close()
    print("Admin user ensured:", email)

if __name__ == "__main__":
    main()

Add create_first_admin script
