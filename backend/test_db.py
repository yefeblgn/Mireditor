import asyncio
from sqlalchemy import text
from database import engine

async def test_connection():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 'SUCCESS'"))
            row = result.fetchone()
            if row and row[0] == 'SUCCESS':
                print("--- Bağlantı Başarılı: MySQL sunucusuna erişildi! ---")
            else:
                print("--- Hata: Beklenen cevap alınamadı. ---")
    except Exception as e:
        print(f"--- Bağlantı Hatası: {str(e)} ---")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
