import asyncio
from database import engine, Base
import models  # Modelleri import et ki Base.metadata.create_all onları görsün

async def test_tables():
    print("--- Tablo oluşturma testi başlatılıyor... ---")
    try:
        async with engine.begin() as conn:
            # Mevcut tabloları silip tekrar oluşturmak istersen (Dikkat: Veriler silinir!)
            # await conn.run_sync(Base.metadata.drop_all) 
            await conn.run_sync(Base.metadata.create_all)
        print("--- Başarılı: Tüm tablolar MySQL veritabanında oluşturuldu! ---")
    except Exception as e:
        print(f"--- Hata: Tablolar oluşturulurken bir sorun çıktı: {str(e)} ---")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_tables())
