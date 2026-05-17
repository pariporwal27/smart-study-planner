from fastapi import APIRouter

router = APIRouter()

@router.get('/users/me')
def read_users_me():
    return {'msg': 'me'}
