import base64

import pytest
from fastapi import HTTPException

from routers.account_routes import _validate_profile_image_data_url
from routers.young_people_photo_routes import _validate_photo


class FakeUpload:
    def __init__(self, content_type, data):
        self.content_type = content_type
        self.file = self
        self._data = data

    def read(self, _limit):
        return self._data


def data_url(mime_type, data):
    return f"data:{mime_type};base64,{base64.b64encode(data).decode('ascii')}"


def test_profile_avatar_accepts_small_png_data_url():
    image = data_url("image/png", b"\x89PNG\r\n\x1a\nsmall")

    assert _validate_profile_image_data_url(image) == image


def test_profile_avatar_rejects_mismatched_mime_signature():
    image = data_url("image/png", b"not-a-png")

    with pytest.raises(HTTPException):
        _validate_profile_image_data_url(image)


def test_child_photo_upload_policy_accepts_webp_signature():
    ext, data = _validate_photo(FakeUpload("image/webp", b"RIFFxxxxWEBP"))

    assert ext == ".webp"
    assert data.startswith(b"RIFF")


def test_child_photo_upload_policy_rejects_pdf_payload():
    with pytest.raises(HTTPException):
        _validate_photo(FakeUpload("application/pdf", b"%PDF"))
