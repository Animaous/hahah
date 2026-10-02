from contextlib import asynccontextmanager
from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "cult.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS cult (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                power TEXT NOT NULL,
                passed INTEGER NOT NULL,
                completion_time REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        connection.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="The Great Cult Of Vajaswi", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CultResult(BaseModel):
    name: str 
    power: str
    passed: bool
    completion_time: float | None = None

class CultUpdate(BaseModel):
    name: str
    power: str

@app.post("/cult", status_code=201)
def create_follower(data: CultResult):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    if data.passed and data.completion_time is None:
        raise HTTPException(
            status_code=400,
            detail="Completion time is required for a passed test"
        )

    role = "Follower" if data.passed else "Servant"

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO cult (name, role, power, passed, completion_time)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                data.name.strip(),
                role,
                data.power,
                int(data.passed),
                data.completion_time,
            ),
        )
        connection.commit()

        row = connection.execute(
            "SELECT * FROM cult WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return dict(row)


@app.get("/cult")
def list_followers():
    """
    Passed members are ordered by least completion time.
    Failed applicants are listed afterwards as Servants.
    """
    with get_connection() as connection:
        passed = connection.execute(
            """
            SELECT id, name, role, power, passed, completion_time, created_at
            FROM cult
            WHERE passed = 1
            ORDER BY completion_time ASC, id ASC
            """
        ).fetchall()

        failed = connection.execute(
            """
            SELECT id, name, role, power, passed, completion_time, created_at
            FROM cult
            WHERE passed = 0
            ORDER BY id ASC
            """
        ).fetchall()

    results = []

    for index, row in enumerate(passed, start=1):
        item = dict(row)
        item["rank"] = index
        results.append(item)

    for row in failed:
        item = dict(row)
        item["rank"] = None
        results.append(item)

    return results


@app.get("/cult/{cult_id}")
def get_follower(cult_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM cult WHERE id = ?",
            (cult_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Follower not found")

    return dict(row)


@app.put("/cult/{cult_id}")
def update_follower(cult_id: int, data: CultUpdate):
    if not data.name.strip() or not data.power.strip():
        raise HTTPException(status_code=400, detail="Name and power are required")

    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE cult SET name = ?, power = ? WHERE id = ?",
            (data.name.strip(), data.power.strip(), cult_id),
        )
        connection.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Follower not found")

        row = connection.execute(
            "SELECT * FROM cult WHERE id = ?", (cult_id,)
        ).fetchone()

    return dict(row)


@app.delete("/cult/{cult_id}")
def delete_follower(cult_id: int):
    # Kept as a CRUD endpoint. The frontend does not need to expose it.
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id FROM cult WHERE id = ?",
            (cult_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Follower not found")

        connection.execute(
            "DELETE FROM cult WHERE id = ?",
            (cult_id,),
        )
        connection.commit()

    return {
        "message": f"{cult_id} no one can leave hahah your demoted"
    }
