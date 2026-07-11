# Saharut

Saharut; saha satış operasyonları, firma ve kullanıcı yönetimi, sipariş, kampanya, prim, ziyaret ve raporlama süreçlerini tek platformda birleştirmeyi hedefleyen B2B bir uygulamadır.

## Proje bileşenleri

Planlanan ana uygulamalar:

- ASP.NET Core Web API backend
- Next.js yönetim ve firma paneli
- React Native mobil saha uygulaması
- PostgreSQL veritabanı
- Docker tabanlı geliştirme ortamı

## Mevcut durum

Backend temel altyapısı çalışmaktadır.

Tamamlanan özellikler:

- Katmanlı backend çözüm yapısı
- PostgreSQL ve Entity Framework Core bağlantısı
- Docker Compose ile yerel veritabanı
- Firma ekleme, listeleme, güncelleme ve soft delete
- Kullanıcı modeli
- Rol modeli
- Kullanıcı–firma ilişkisi
- Kullanıcı–rol ilişkisi
- OTP kodu oluşturma
- OTP kodunu hashleyerek saklama
- OTP süre kontrolü
- Hatalı doğrulama deneme sınırı
- JWT access token üretimi
- Rollerinin JWT içine eklenmesi
- Korumalı `/api/v1/auth/me` endpoint'i

Projenin güncel durumu için:

```text
docs/PROJECT_STATUS.md
```

## Kullanılan teknolojiler

### Backend

- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- Npgsql
- JWT Authentication

### Veritabanı

- PostgreSQL 17
- Docker

### Planlanan frontend

- Next.js
- TypeScript
- Tailwind CSS

### Planlanan mobil uygulama

- React Native
- Expo

## Proje yapısı

```text
Saharut/
├── backend/
│   ├── Saharut.slnx
│   └── src/
│       ├── Saharut.Api/
│       ├── Saharut.Application/
│       ├── Saharut.Domain/
│       └── Saharut.Infrastructure/
├── docs/
├── infrastructure/
│   └── docker-compose.yml
├── .gitignore
└── README.md
```

## Yerel geliştirme gereksinimleri

Projeyi çalıştırmak için bilgisayarda şunların kurulu olması gerekir:

- .NET 10 SDK
- Docker Desktop
- Git
- Node.js 24 veya üzeri
- Visual Studio Code veya Visual Studio

## PostgreSQL'i çalıştırma

Ana proje klasöründen:

```powershell
cd infrastructure
docker compose up -d
```

Çalışan konteynerleri kontrol etmek için:

```powershell
docker ps
```

PostgreSQL geliştirme ortamında şu port üzerinden çalışmaktadır:

```text
localhost:5433
```

## API'yi çalıştırma

Ana proje klasöründen:

```powershell
cd backend\src\Saharut.Api
dotnet run
```

Varsayılan API adresi:

```text
http://localhost:5062
```

## Projeyi derleme

```powershell
cd backend\src\Saharut.Api
dotnet build
```

## Migration oluşturma

```powershell
cd backend\src\Saharut.Api

dotnet ef migrations add MigrationName `
  --project ..\Saharut.Infrastructure `
  --startup-project .
```

## Migration'ları veritabanına uygulama

```powershell
cd backend\src\Saharut.Api

dotnet ef database update `
  --project ..\Saharut.Infrastructure `
  --startup-project .
```

## Mevcut API endpoint'leri

### Sistem

```text
GET /api/v1/health
```

### Firmalar

```text
GET    /api/v1/companies
GET    /api/v1/companies/{id}
POST   /api/v1/companies
PUT    /api/v1/companies/{id}
DELETE /api/v1/companies/{id}
```

### Roller

```text
GET  /api/v1/roles
POST /api/v1/roles
```

### Kullanıcılar

```text
GET  /api/v1/users
GET  /api/v1/users/{id}
POST /api/v1/users
```

### Kimlik doğrulama

```text
POST /api/v1/auth/send-otp
POST /api/v1/auth/verify-otp
GET  /api/v1/auth/me
```

## OTP giriş akışı

1. Kullanıcı telefon numarasını gönderir.
2. Sistem altı haneli OTP kodu üretir.
3. Kod açık şekilde değil, hashlenerek veritabanına kaydedilir.
4. Kod üç dakika geçerlidir.
5. Kullanıcı kodu doğrular.
6. Başarılı doğrulama sonrasında JWT access token oluşturulur.
7. Kullanıcının rolleri JWT içine eklenir.
8. Token ile korumalı endpoint'lere erişilir.

Geliştirme ortamında OTP kodu API cevabında gösterilmektedir. Gerçek SMS entegrasyonu yapıldığında bu alan kaldırılacaktır.

## Temel roller

Sistemde şu roller planlanmıştır:

- `SUPER_ADMIN`
- `OPERATIONS_MANAGER`
- `MANUFACTURER_MANAGER`
- `DISTRIBUTOR_MANAGER`
- `FIELD_SALES`
- `FINANCE_MANAGER`

## Sıradaki geliştirme adımları

- Rol bazlı endpoint yetkilendirmesi
- Permission altyapısı
- Refresh token desteği
- Kullanıcı güncelleme ve silme işlemleri
- Next.js yönetim paneli
- Panel giriş ekranı
- API ve panel bağlantısı
- Ürün ve kategori modülü
- Satış noktaları
- Sipariş modülü
- Kampanya ve prim sistemi

Ayrıntılı sonraki adımlar için:

```text
docs/NEXT_STEPS.md
```

## Güvenlik

Canlı ortamda aşağıdaki bilgiler repository içinde saklanmamalıdır:

- Veritabanı kullanıcı adı ve şifresi
- JWT secret key
- OTP hash secret
- SMS servis anahtarları
- Harita API anahtarları
- Diğer üçüncü taraf entegrasyon anahtarları

Canlı ortamda environment variable veya güvenli bir secret yönetim servisi kullanılmalıdır.

Geliştirme ortamında kullanılan örnek anahtarlar canlı ortamda kesinlikle kullanılmamalıdır.

## Repository

```text
https://github.com/yavuzhankiyi/saharut
```