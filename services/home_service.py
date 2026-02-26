from datetime import datetime
from psycopg2.extensions import connection as PGConnection
from models.home import HomeCreate, HomeUpdate

def create_home(conn: PGConnection, data: HomeCreate) -> int:
    now = datetime.utcnow()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO homes
            (provider_id, name, address, postcode, region, local_authority,
             ofsted_urn, registered_manager_id, archived, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                data.provider_id,
                data.name,
                data.address,
                data.postcode,
                data.region,
                data.local_authority,
                data.ofsted_urn,
                data.registered_manager_id,
                False,
                now,
                now,
            )
        )
        row = cur.fetchone()
        home_id = row["id"]
        conn.commit()
        return home_id

def get_home(conn: PGConnection, home_id: int):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM homes WHERE id = %s", (home_id,))
        return cur.fetchone()

def list_homes(conn: PGConnection, provider_id: int):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM homes
            WHERE provider_id = %s AND archived = FALSE
            ORDER BY name
            """,
            (provider_id,)
        )
        return cur.fetchall()

def update_home(conn: PGConnection, home_id: int, data: HomeUpdate):
    fields = []
    values = []

    for field, value in data.dict(exclude_unset=True).items():
        fields.append(f"{field} = %s")
        values.append(value)

    if not fields:
        return

    fields.append("updated_at = %s")
    values.append(datetime.utcnow())
    values.append(home_id)

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE homes SET {', '.join(fields)} WHERE id = %s",
            tuple(values)
        )
        conn.commit()
