# Saharut Proje Durumu

Bu dosya, yeni bir sohbet veya yeni bir geliştirme oturumu başladığında projenin kaldığı noktayı hızlıca anlamak için tutulur.

Son güncelleme: 11 Temmuz 2026

## Proje özeti

Saharut; saha satış ekipleri, üreticiler, distribütörler ve sistem yöneticileri için geliştirilen B2B bir platformdur.

Planlanan ana modüller:

- Firma yönetimi
- Kullanıcı ve rol yönetimi
- Telefon numarasıyla OTP girişi
- JWT tabanlı kimlik doğrulama
- Ürün ve kategori yönetimi
- Satış noktaları
- Saha ziyaretleri
- Sipariş yönetimi
- Kampanyalar
- Prim ve cüzdan işlemleri
- Raporlama
- Harita ve rota
- SMS entegrasyonu
- Web yönetim paneli
- Mobil saha uygulaması

## Repository

```text
https://github.com/yavuzhankiyi/saharut
```

Ana branch:

```text
main
```

## Kullanılan teknolojiler

### Backend

- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- Npgsql
- JWT Bearer Authentication

### Veritabanı

- PostgreSQL 17
- Docker Compose

### Planlanan web paneli

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

## Yerel geliştirme bilgileri

### API adresi

```text
http://localhost:5062
```

### PostgreSQL adresi

```text
Host: localhost
Port: 5433
Database: saharut_db
Username: saharut_user
```

Veritabanı şifresi yalnızca yerel geliştirme ortamında kullanılmaktadır ve canlı sistemde değiştirilmelidir.

### Test kullanıcısı

```text
Ad: Yavuzhan
Soyad: Kıyı
Telefon: 05551112233
E-posta: yavuzhan@saharut.com
```

Bu bilgiler yalnızca yerel geliştirme ve API testi için kullanılmaktadır.

## Tamamlanan altyapı

- Git repository oluşturuldu
- GitHub bağlantısı kuruldu
- .NET solution oluşturuldu
- Katmanlı backend yapısı kuruldu
- PostgreSQL Docker konteyneri oluşturuldu
- Entity Framework Core bağlantısı kuruldu
- Migration altyapısı çalıştırıldı
- Health endpoint oluşturuldu

## Tamamlanan firma modülü

- Firma ekleme
- Firma listeleme
- Tek firma görüntüleme
- Firma güncelleme
- Soft delete
- Aktif ve pasif firma alanları
- Vergi numarası
- Telefon numarası
- E-posta

## Tamamlanan kullanıcı ve rol altyapısı

- User entity
- Role entity
- UserRole ilişkisi
- CompanyUser ilişkisi
- Kullanıcının birden fazla role bağlanabilmesi
- Kullanıcının birden fazla firmaya bağlanabilmesi
- Rol ekleme
- Rol listeleme
- Kullanıcı ekleme
- Kullanıcı listeleme
- Tek kullanıcı görüntüleme
- Kullanıcı eklenirken firma atama
- Kullanıcı eklenirken rol atama

## Sistemde tanımlanan temel roller

```text
SUPER_ADMIN
OPERATIONS_MANAGER
MANUFACTURER_MANAGER
DISTRIBUTOR_MANAGER
FIELD_SALES
```

Planlanan ek rol:

```text
FINANCE_MANAGER
```

## Tamamlanan OTP altyapısı

- OtpCode entity oluşturuldu
- OTP kodu veritabanına açık olarak kaydedilmiyor
- HMAC SHA-256 ile hashleniyor
- Altı haneli kod üretiliyor
- Kod üç dakika geçerli
- Aynı telefon için aktif eski kodlar geçersiz yapılıyor
- Yeni OTP isteme süresi 60 saniye
- En fazla beş hatalı doğrulama denemesi
- Başarılı doğrulamada kod kullanılmış olarak işaretleniyor
- Kullanıcının telefon numarası doğrulanmış olarak güncelleniyor
- Kullanıcının son giriş zamanı kaydediliyor

## Tamamlanan JWT altyapısı

- JWT Bearer paketi eklendi
- Issuer kontrolü
- Audience kontrolü
- Token süre kontrolü
- Signing key kontrolü
- Kullanıcı ID bilgisi token içine ekleniyor
- Kullanıcı adı token içine ekleniyor
- Telefon numarası token içine ekleniyor
- E-posta token içine ekleniyor
- Kullanıcı rolleri token içine ekleniyor
- Access token süresi 60 dakika
- OTP doğrulamasından sonra token üretiliyor

## Tamamlanan kimlik doğrulama endpoint'leri

```text
POST /api/v1/auth/send-otp
POST /api/v1/auth/verify-otp
GET  /api/v1/auth/me
```

`/api/v1/auth/me` endpoint'i yalnızca geçerli JWT token ile çalışır.

## Mevcut temel endpoint'ler

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

## Oluşturulan migration'lar

Projede şu migration'ların bulunması beklenmektedir:

```text
InitialCreate
AddUsersAndRoles
AddOtpCodes
```

## Bilinen teknik notlar

- Docker PostgreSQL portu `5433` olarak kullanılmaktadır.
- Bilgisayarda `5432` portunda başka bir PostgreSQL servisi bulunduğu için Docker konteyneri `5433` portuna taşınmıştır.
- API çalışırken yeniden build alınırsa DLL dosyaları kilitlenebilir.
- Böyle bir durumda çalışan işlem şu komutla kapatılabilir:

```powershell
Get-Process Saharut.Api -ErrorAction SilentlyContinue | Stop-Process -Force
```

- Microsoft.OpenApi paketinin eski sürümüyle ilgili güvenlik uyarısı görülmektedir.
- Bu paket güncellenmeli veya güvenli sürüme geçirilmelidir.

## Güvenlik notları

Aşağıdaki değerler canlı ortamda repository içinde tutulmamalıdır:

- PostgreSQL şifresi
- JWT secret key
- OTP hash secret
- SMS servis anahtarları
- Harita API anahtarları
- Dosya depolama anahtarları

Canlı ortamda environment variable veya güvenli secret yönetimi kullanılmalıdır.

Geliştirme ortamındaki OTP kodu API cevabında gösterilmektedir. Gerçek SMS entegrasyonunda bu alan kaldırılmalıdır.

## Son tamamlanan iş

Son tamamlanan geliştirme:

```text
OTP doğrulamasından sonra JWT access token üretimi
```

Ek olarak:

```text
GET /api/v1/auth/me
```

korumalı endpoint'i oluşturuldu ve JWT ile test edildi.

## Sıradaki iş

Bir sonraki geliştirme adımı:

```text
Rol bazlı yetkilendirme
```

Yapılacaklar:

- `SUPER_ADMIN` rolüyle yönetim endpoint'lerini korumak
- `OPERATIONS_MANAGER` rolüne uygun yetkiler vermek
- Firma endpoint'lerine `[Authorize]` eklemek
- Kullanıcı endpoint'lerine `[Authorize]` eklemek
- Rol endpoint'lerine `[Authorize]` eklemek
- Yetkisiz kullanıcılar için 401 ve 403 testleri yapmak
- Daha sonra permission tabanlı yetkilendirmeye geçmek

## Yeni sohbet için başlangıç mesajı

Yeni bir ChatGPT sohbetinde şu mesaj kullanılabilir:

```text
https://github.com/yavuzhankiyi/saharut reposundaki Saharut projesine devam ediyoruz.

Önce README.md, docs/PROJECT_STATUS.md ve docs/NEXT_STEPS.md dosyalarını incele. Ana branch main.

Şu anda tamamlanan son özellik OTP doğrulamasından sonra JWT access token üretimi ve korumalı GET /api/v1/auth/me endpoint'i.

Sıradaki görev rol bazlı yetkilendirme. Firma, kullanıcı ve rol yönetimi endpoint'lerine SUPER_ADMIN ve OPERATIONS_MANAGER erişimi ekleyerek devam et.
```