@router.get("/homes")
def list_homes(user = Depends(require_role(["provider_admin"])), conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT h.id, h.name, p.name AS provider_name
            FROM homes h
            LEFT JOIN providers p ON h.provider_id = p.id
            ORDER BY h.name
        """)
        return cur.fetchall()
