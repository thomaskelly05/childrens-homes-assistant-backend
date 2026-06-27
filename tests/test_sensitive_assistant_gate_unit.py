from auth.sensitive_assistant_gate import (
    is_sensitive_assistant_gated_path,
    is_sensitive_assistant_shell_path,
    is_sensitive_assistant_stream_path,
    mfa_policy_applies,
)


def test_sensitive_assistant_shell_paths():
    assert is_sensitive_assistant_shell_path("/assistant", "GET")
    assert is_sensitive_assistant_shell_path("/assistant.html", "GET")
    assert not is_sensitive_assistant_shell_path("/assistant/assets/audit", "GET")
    assert not is_sensitive_assistant_shell_path("/orb", "GET")


def test_sensitive_assistant_stream_paths():
    assert is_sensitive_assistant_stream_path("/assistant/general/stream", "POST")
    assert is_sensitive_assistant_stream_path("/assistant/os/home/stream", "POST")
    assert is_sensitive_assistant_stream_path("/assistant/os/quality/stream", "POST")
    assert not is_sensitive_assistant_stream_path("/assistant/os/context/1", "GET")
    assert not is_sensitive_assistant_stream_path("/orb/standalone/conversation/stream", "POST")


def test_orb_paths_are_not_gated():
    assert not is_sensitive_assistant_gated_path("/orb", "GET")
    assert not is_sensitive_assistant_gated_path("/orb.html", "GET")


def test_mfa_policy_role_aware():
    assert mfa_policy_applies("admin", mfa_enabled=False)
    assert mfa_policy_applies("manager", mfa_enabled=False)
    assert not mfa_policy_applies("staff", mfa_enabled=False)
    assert mfa_policy_applies("staff", mfa_enabled=True)
