from database import engine, Base
import models

def test_sync():
    print("--- Standart MySQL (Sync) Testi Başlatılıyor... ---")
    try:
        # Tablo oluşturma
        Base.metadata.create_all(bind=engine)
        print("--- Başarılı: Tablolar oluşturuldu / güncellendi! ---")
    except Exception as e:
        print(f"--- Hata: {str(e)} ---")

if __name__ == "__main__":
    test_sync()
