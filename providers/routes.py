@router.get("/providers")
def list_providers(user = Depends(require_role(["provider_admin"])), conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, name, region
            FROM providers
            ORDER BY name
        """)
        return cur.fetchall()
