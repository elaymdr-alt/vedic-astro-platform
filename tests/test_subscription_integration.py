import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base
from backend.models import User
from backend.subscription import can_generate_report

engine = create_engine("sqlite:///:memory:")
SessionLocal = sessionmaker(bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

def test_quota_limits(db):
    user = User(username="test", email="t@t.com", hashed_password="pw", subscription_status="free")
    db.add(user)
    db.commit()
    assert can_generate_report(user, 0) == True
    assert can_generate_report(user, 1) == True
    assert can_generate_report(user, 2) == False
