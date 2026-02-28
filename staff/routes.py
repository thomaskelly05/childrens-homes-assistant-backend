@router.get("/staff")
def list_staff(user = Depends(require_role(["provider_admin", "regional_manager"])), conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                u.id, 
                u.full_name, 
                u.email, 
                h.name AS home_name
            FROM users u
            LEFT JOIN homes h ON u.home_id = h.id
            WHERE u.role = 'staff'
            ORDER BY u.full_name
        """)
        return cur.fetchall()
