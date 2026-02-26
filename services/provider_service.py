from datetime import datetime
from psycopg2.extensions import connection as PGConnection
from models.provider import ProviderCreate, ProviderUpdate

def create_provider(conn: PGConnection, data: ProviderCreate) -> int:
    now = datetime.utcnow()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO providers
            (name, region, address, postcode, local_authority,
             safeguarding_lead_name, safeguarding_lead_email,
             archived, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                data.name,
                data.region,
                data.address,
                data.postcode,
                data.local_authority,
                data.safeguarding_lead_name,
                data.safeguarding_lead_email,
                False,
                now,
                now,
            )
        )
        provider_id = cur.fetchone()[0]
        conn.commit()
        return provider_id

def get_provider(conn: PGConnection, provider_id: int):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, region, address, postcode, local_authority,
                   safeguarding_lead_name, safeguarding_lead_email,
                   archived, created_at, updated_at
            FROM providers
            WHERE id = %s
            """,
            (provider_id,)
        )
        return cur.fetchone()

def list_providers(conn: PGConnection):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, region, address, postcode, local_authority,
                   safeguarding_lead_name, safeguarding_lead_email,
                   archived, created_at, updated_at
            FROM providers
            WHERE archived = FALSE
            ORDER BY name
            """
        )
        return cur.fetchall()

def update_provider(conn: PGConnection, provider_id: int, data: ProviderUpdate):
    fields = []
    values = []

    for field, value in data.dict(exclude_unset=True).items():
        fields.append(f"{field} = %s")
        values.append(value)

    if not fields:
        return

    fields.append("updated_at = %s")
    values.append(datetime.utcnow())
    values.append(provider_id)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE providers
            SET {", ".join(fields)}
            WHERE id = %s
            """,
            tuple(values)
        )
        conn.commit()
