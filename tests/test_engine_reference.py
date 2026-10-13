import pytest
import json
import glob
import os

def test_reference_scenarios():
    files = glob.glob('tests/fixtures/reference/*.json')
    assert len(files) == 100, "باید ۱۰۰ فایل تست وجود داشته باشد"
    
    for f in files:
        with open(f, 'r') as jf:
            data = json.load(jf)
            assert 'expected' in data, f"فایل {f} فاقد داده‌های مورد انتظار است"
