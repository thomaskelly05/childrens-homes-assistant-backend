import pytest
from fastapi import HTTPException

from routers.young_people_profile_routes import _validate_image_data_url


def test_avatar_upload_policy_accepts_base64_image_data_urls():
    image = "data:image/png;base64,iVBORw0KGgo="

    assert _validate_image_data_url(image) == image


def test_avatar_upload_policy_rejects_non_image_or_raw_paths():
    with pytest.raises(HTTPException):
        _validate_image_data_url("/uploads/provider-1/avatar.png")

    with pytest.raises(HTTPException):
        _validate_image_data_url("data:text/plain;base64,SGVsbG8=")
