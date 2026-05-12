from fastapi import APIRouter

router = APIRouter(tags=['OS Enterprise Compat'])


def ok(name: str):
    return {
        'ok': True,
        'source': 'compat-router',
        'module': name,
        'status': 'connected'
    }


@router.get('/api/tasks')
async def tasks():
    return ok('tasks')


@router.get('/api/evidence')
async def evidence():
    return ok('evidence')


@router.get('/api/document-library')
async def document_library():
    return ok('document-library')


@router.get('/api/health')
async def health():
    return ok('health')


@router.get('/api/mar')
async def mar():
    return ok('mar')


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
    return ok('finance')


@router.get('/api/pocket-money')
async def pocket_money():
    return ok('pocket-money')


@router.get('/api/sanctions')
async def sanctions():
    return ok('sanctions')


@router.get('/api/connect')
async def connect():
    return ok('connect')


@router.get('/api/mail')
async def mail():
    return ok('mail')


@router.get('/api/calendar')
async def calendar():
    return ok('calendar')
