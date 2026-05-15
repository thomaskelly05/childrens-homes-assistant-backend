from fastapi import APIRouter

router = APIRouter(tags=['OS Enterprise Compat'])


def ok(name: str):
    return {
        'ok': True,
        'source': 'compat-router',
        'module': name,
        'status': 'connected'
    }


@router.get('/api/auth/me')
async def auth_me():
    return {
        'ok': True,
        'authenticated': True,
        'source': 'compat-router',
        'user': {
            'id': 'runtime-user',
            'name': 'IndiCare User',
            'role': 'operator'
        }
    }


@router.get('/api/tasks')
async def tasks():
    return {'ok': True, 'tasks': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/actions')
async def actions():
    return {'ok': True, 'actions': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/notifications')
async def notifications():
    return {'ok': True, 'notifications': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/evidence')
async def evidence():
    return {'ok': True, 'evidence': [], 'items': [], 'source': 'compat-router'}


async def documents():
    return {'ok': True, 'documents': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/document-library')
async def document_library():
    return {'ok': True, 'documents': [], 'folders': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/health')
async def health():
    return {'ok': True, 'health': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/young-people/health')
async def young_people_health():
    return {'ok': True, 'health': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/mar')
async def mar():
    return {'ok': True, 'mar': [], 'medications': [], 'items': [], 'source': 'compat-router'}


async def staff():
    return {'ok': True, 'staff': [], 'items': [], 'source': 'compat-router'}


async def rota():
    return {'ok': True, 'rota': [], 'shifts': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/rostering')
async def rostering():
    return {'ok': True, 'rostering': [], 'shifts': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/staff-profile')
async def staff_profile():
    return ok('staff-profile')


@router.get('/api/staff-today')
async def staff_today():
    return ok('staff-today')


@router.get('/api/supervision')
async def supervision():
    return ok('supervision')


@router.get('/api/reg44')
async def reg44():
    return ok('reg44')


@router.get('/api/qa')
async def qa():
    return ok('qa')


@router.get('/api/compliance')
async def compliance():
    return ok('compliance')


@router.get('/api/ofsted-pack')
async def ofsted_pack():
    return ok('ofsted-pack')


@router.get('/api/finance')
async def finance():
    return {'ok': True, 'finance': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/pocket-money')
async def pocket_money():
    return {'ok': True, 'pocket_money': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/sanctions')
async def sanctions():
    return {'ok': True, 'sanctions': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/connect')
async def connect():
    return {'ok': True, 'messages': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/mail')
async def mail():
    return {'ok': True, 'mail': [], 'items': [], 'source': 'compat-router'}


@router.get('/api/calendar')
async def calendar():
    return {'ok': True, 'calendar': [], 'items': [], 'source': 'compat-router'}
