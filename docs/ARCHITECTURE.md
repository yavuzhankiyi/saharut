# Saharut Mimari Dokümantasyonu

Bu doküman, Saharut projesinin teknik mimarisini, katmanlarını, temel tasarım kararlarını ve ileride izlenecek yapıyı açıklar.

## 1. Genel mimari

Saharut başlangıç aşamasında modüler monolith yaklaşımıyla geliştirilmektedir.

Bu yaklaşımın seçilme nedenleri:

- Projenin ilk sürümünde mikroservis karmaşıklığından kaçınmak
- Tek geliştirici veya küçük ekip için yönetilebilir bir yapı kurmak
- Ortak veritabanı ve ortak dağıtım süreciyle hızlı ilerlemek
- İleride gerekli modülleri bağımsız servislere ayırmaya uygun bir temel hazırlamak

Planlanan genel yapı:

```text
Web Panel
     |
Mobil Uygulama
     |
ASP.NET Core Web API
     |
PostgreSQL
```

İleride sisteme şu servisler eklenebilir:

```text
Redis
Background Worker
SMS Provider
Map Provider
Object Storage
Ruulio Integration
Notification Service
```

## 2. Ana uygulama bileşenleri

### Backend API

Teknik yapı:

- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL
- JWT Bearer Authentication

Backend sorumlulukları:

- Kimlik doğrulama
- Yetkilendirme
- Firma yönetimi
- Kullanıcı yönetimi
- Rol ve permission yönetimi
- Ürün yönetimi
- Sipariş yönetimi
- Kampanya hesaplamaları
- Prim ve cüzdan işlemleri
- Ziyaret yönetimi
- Raporlama
- Entegrasyonlar

### Web paneli

Planlanan teknoloji:

- Next.js
- TypeScript
- Tailwind CSS

Web panelinin kullanıcıları:

- Saharut yöneticileri
- Operasyon yetkilileri
- Üretici yöneticileri
- Distribütör yöneticileri
- Finans yetkilileri

### Mobil uygulama

Planlanan teknoloji:

- React Native
- Expo

Mobil uygulamanın ana kullanıcısı:

- Saha satış personeli

Mobil uygulama sorumlulukları:

- OTP ile giriş
- Günlük rota
- Satış noktası görüntüleme
- Ziyaret başlatma ve tamamlama
- Sipariş oluşturma
- Prim ve cüzdan görüntüleme
- Eğitim içerikleri
- Bildirimler

## 3. Backend katmanları

Backend solution şu katmanlardan oluşmaktadır:

```text
Saharut.Api
Saharut.Application
Saharut.Domain
Saharut.Infrastructure
```

### Saharut.Domain

Domain katmanı sistemin temel iş nesnelerini içerir.

Şu anda bulunan ana entity sınıfları:

```text
BaseEntity
Company
User
Role
UserRole
CompanyUser
OtpCode
```

Domain katmanı şu tür öğeleri içerecektir:

- Entity sınıfları
- Enum tanımları
- Domain kuralları
- Value object sınıfları
- Domain exception sınıfları

Domain katmanı diğer katmanlara bağımlı olmamalıdır.

### Saharut.Application

Application katmanı iş akışlarını yönetecektir.

Planlanan içerik:

- Use case sınıfları
- Command ve query modelleri
- DTO sınıfları
- Validation
- Interface tanımları
- Yetkilendirme kuralları
- Servis sözleşmeleri

Application katmanı yalnızca Domain katmanına bağımlıdır.

### Saharut.Infrastructure

Infrastructure katmanı dış dünya bağlantılarını içerir.

Şu anda bulunan temel yapı:

```text
Persistence/SaharutDbContext.cs
Migrations/
```

Planlanan sorumluluklar:

- Entity Framework Core
- PostgreSQL bağlantısı
- Repository implementasyonları
- SMS entegrasyonu
- E-posta entegrasyonu
- Dosya depolama
- Harita servisleri
- Ruulio entegrasyonu
- Cache
- Background jobs

Infrastructure katmanı Domain ve Application katmanlarına bağımlıdır.

### Saharut.Api

API katmanı HTTP isteklerini karşılar.

Şu anda bulunan controller sınıfları:

```text
HealthController
CompaniesController
RolesController
UsersController
AuthController
```

API katmanının sorumlulukları:

- HTTP endpoint tanımları
- Authentication
- Authorization
- Request ve response yönetimi
- Global exception handling
- OpenAPI dokümantasyonu
- Rate limiting
- CORS
- API versioning

API katmanı Application ve Infrastructure katmanlarına bağımlıdır.

## 4. Katman bağımlılıkları

Bağımlılık yönü şu şekildedir:

```text
Saharut.Api
├── Saharut.Application
└── Saharut.Infrastructure

Saharut.Infrastructure
├── Saharut.Application
└── Saharut.Domain

Saharut.Application
└── Saharut.Domain
```

Domain katmanı hiçbir dış katmana bağımlı değildir.

## 5. Veritabanı mimarisi

Kullanılan veritabanı:

```text
PostgreSQL 17
```

Yerel geliştirme ortamında Docker Compose kullanılmaktadır.

Bağlantı:

```text
Host: localhost
Port: 5433
Database: saharut_db
```

Portun `5433` olmasının nedeni bilgisayarda `5432` portunda başka bir PostgreSQL servisinin bulunmasıdır.

## 6. Ortak entity alanları

Tüm temel entity sınıfları `BaseEntity` sınıfından türemektedir.

Ortak alanlar:

```text
Id
CreatedAt
UpdatedAt
IsDeleted
```

### Id

Tüm kayıtlar `Guid` kimliği kullanır.

### CreatedAt

Kaydın oluşturulma zamanını UTC olarak saklar.

### UpdatedAt

Kaydın son güncellenme zamanını UTC olarak saklar.

### IsDeleted

Soft delete işlemleri için kullanılır.

Veriler mümkün olduğu sürece fiziksel olarak silinmez.

## 7. Firma modeli

`Company` entity şu temel alanları içerir:

```text
Name
TaxNumber
PhoneNumber
Email
IsActive
```

Bir firma birden fazla kullanıcıya sahip olabilir.

İlişki:

```text
Company
  |
  └── CompanyUser
          |
          └── User
```

Bu ara tablo sayesinde bir kullanıcı birden fazla firmaya bağlanabilir.

## 8. Kullanıcı modeli

`User` entity şu temel alanları içerir:

```text
FirstName
LastName
PhoneNumber
Email
PhoneNumberConfirmed
IsActive
LastLoginAt
```

Telefon numarası benzersizdir.

Kullanıcıların giriş kimliği olarak telefon numarası kullanılmaktadır.

## 9. Rol modeli

`Role` entity şu alanları içerir:

```text
Name
Code
Description
IsActive
```

Rol kodu benzersizdir.

Örnek rol kodları:

```text
SUPER_ADMIN
OPERATIONS_MANAGER
MANUFACTURER_MANAGER
DISTRIBUTOR_MANAGER
FIELD_SALES
FINANCE_MANAGER
```

Kullanıcı ve rol ilişkisi:

```text
User
  |
  └── UserRole
          |
          └── Role
```

Bu yapı bir kullanıcının birden fazla role sahip olmasını destekler.

## 10. Kimlik doğrulama mimarisi

Kimlik doğrulama telefon numarası ve OTP üzerinden yapılmaktadır.

Akış:

```text
Telefon numarası gönderilir
        |
        v
OTP oluşturulur
        |
        v
OTP hashlenerek saklanır
        |
        v
Kullanıcı kodu doğrular
        |
        v
JWT access token üretilir
        |
        v
Korumalı endpoint'lere erişilir
```

## 11. OTP güvenlik modeli

OTP kodu altı hanelidir.

Kurallar:

- Kod üç dakika geçerlidir.
- Aynı telefon için yeni kod üretildiğinde önceki aktif kodlar geçersiz yapılır.
- Yeni kod isteme aralığı 60 saniyedir.
- En fazla beş hatalı doğrulama denemesi yapılabilir.
- Kod veritabanında açık olarak saklanmaz.
- HMAC SHA-256 ile hashlenir.
- IP adresi kaydedilir.
- Başarılı kullanım sonrasında tekrar kullanılamaz.

Geliştirme ortamında OTP kodu test amacıyla API cevabında gösterilmektedir.

Canlı ortamda bu davranış kaldırılmalıdır.

## 12. JWT güvenlik modeli

JWT token şu kontrollerle doğrulanmaktadır:

```text
Issuer
Audience
Lifetime
Signing Key
```

Token içinde şu bilgiler bulunur:

```text
User Id
Full Name
Phone Number
Email
Roles
JTI
```

Access token süresi:

```text
60 dakika
```

İleride refresh token altyapısı eklenecektir.

## 13. Yetkilendirme modeli

Şu anda temel JWT authentication bulunmaktadır.

Sıradaki adım rol bazlı yetkilendirmedir.

Örnek:

```csharp
[Authorize(Roles = "SUPER_ADMIN,OPERATIONS_MANAGER")]
```

İleride sadece role bağlı yapı yerine permission tabanlı yetkilendirmeye geçilecektir.

Örnek permission kodları:

```text
Companies.View
Companies.Create
Companies.Update
Companies.Delete

Users.View
Users.Create
Users.Update
Users.Delete

Roles.View
Roles.Manage

Products.View
Products.Create
Products.Update
Products.Delete

Orders.View
Orders.Create
Orders.Approve
Orders.Cancel

Campaigns.View
Campaigns.Manage

Wallet.View
Wallet.Manage

Reports.View
Reports.Export
```

Planlanan ilişki:

```text
Role
  |
  └── RolePermission
            |
            └── Permission
```

## 14. API tasarım kuralları

API endpoint'leri versiyonlu olarak tasarlanmaktadır.

Örnek:

```text
/api/v1/companies
/api/v1/users
/api/v1/auth/send-otp
```

HTTP metodları:

```text
GET    Veri okuma
POST   Yeni kayıt oluşturma
PUT    Tam güncelleme
PATCH  Kısmi güncelleme
DELETE Silme veya soft delete
```

Hata cevapları mümkün olduğunca şu yapıda olmalıdır:

```json
{
  "success": false,
  "message": "Hata açıklaması"
}
```

Başarılı cevaplarda mümkün olduğunca şu alanlar kullanılmalıdır:

```json
{
  "success": true,
  "message": "İşlem başarılı"
}
```

## 15. Soft delete yaklaşımı

Firma ve kullanıcı gibi önemli veriler fiziksel olarak silinmemelidir.

Soft delete sırasında:

```text
IsDeleted = true
IsActive = false
UpdatedAt = UTC zamanı
```

Listeleme sorgularında:

```csharp
.Where(entity => !entity.IsDeleted)
```

filtresi uygulanır.

İleride global query filter kullanılabilir.

## 16. Transaction yaklaşımı

Birden fazla tabloyu etkileyen işlemler transaction içinde yapılmalıdır.

Örnek:

```text
Kullanıcı oluşturma
Firma atama
Rol atama
```

Bu üç işlem tek transaction içinde tamamlanmalıdır.

Herhangi bir hata oluşursa tüm işlem geri alınmalıdır.

## 17. Migration yaklaşımı

Her anlamlı veritabanı değişikliği için yeni migration oluşturulur.

Örnek migration'lar:

```text
InitialCreate
AddUsersAndRoles
AddOtpCodes
```

Migration oluşturma:

```powershell
cd backend\src\Saharut.Api

dotnet ef migrations add MigrationName `
  --project ..\Saharut.Infrastructure `
  --startup-project .
```

Migration uygulama:

```powershell
dotnet ef database update `
  --project ..\Saharut.Infrastructure `
  --startup-project .
```

Daha önce uygulanmış migration dosyaları değiştirilmemelidir.

Yeni değişiklikler için yeni migration oluşturulmalıdır.

## 18. Docker mimarisi

Şu anda Docker yalnızca PostgreSQL için kullanılmaktadır.

Mevcut yapı:

```text
Docker Compose
└── PostgreSQL
```

İleride planlanan yapı:

```text
Docker Compose
├── PostgreSQL
├── Redis
├── ASP.NET Core API
├── Next.js Panel
└── Background Worker
```

Canlı ortamda Nginx reverse proxy kullanılabilir.

## 19. Planlanan modüller

### Ürün modülü

```text
ProductCategory
Product
ProductImage
ProductPrice
ProductStock
```

### Satış noktası modülü

```text
Store
StoreAddress
StoreContact
StoreLocation
StoreAssignment
Region
```

### Sipariş modülü

```text
Order
OrderItem
OrderStatusHistory
OrderNote
OrderAssignment
Delivery
Collection
```

### Kampanya modülü

```text
Campaign
CampaignRule
CampaignProduct
CampaignParticipant
CampaignProgress
Reward
```

### Cüzdan modülü

```text
Wallet
WalletTransaction
```

### Ziyaret modülü

```text
VisitPlan
Visit
VisitPhoto
VisitNote
VisitResult
```

### Eğitim modülü

```text
TrainingCategory
TrainingContent
TrainingDocument
TrainingProgress
```

### Sistem modülü

```text
Notification
SmsLog
IntegrationLog
AuditLog
SystemSetting
```

## 20. Dosya depolama yaklaşımı

Dosyalar doğrudan PostgreSQL içinde saklanmamalıdır.

Veritabanında yalnızca dosya bilgileri ve URL saklanmalıdır.

Planlanan depolama seçenekleri:

```text
Cloudflare R2
AWS S3
Azure Blob Storage
MinIO
```

Saklanabilecek dosya türleri:

- Ürün görselleri
- Kampanya görselleri
- Ziyaret fotoğrafları
- Eğitim videoları
- Eğitim dokümanları
- Rapor dosyaları

## 21. Tarih ve saat yaklaşımı

Backend ve veritabanında tarihler UTC olarak saklanmalıdır.

Kullanıcı arayüzünde kullanıcının yerel saat dilimine dönüştürülmelidir.

Türkiye için görüntüleme saat dilimi:

```text
Europe/Istanbul
```

## 22. Güvenlik yaklaşımı

Canlı ortamda aşağıdaki bilgiler kaynak kod içinde bulunmamalıdır:

```text
Database password
JWT secret
OTP hash secret
SMS credentials
Map API keys
Storage credentials
Third-party integration credentials
```

Bu değerler environment variable veya secret manager ile sağlanmalıdır.

Ayrıca uygulanması planlanan güvenlik önlemleri:

- Rate limiting
- Request validation
- Global exception handling
- Audit log
- IP bazlı kayıt
- Dosya tipi kontrolü
- Dosya boyutu kontrolü
- CORS kısıtlaması
- HTTPS zorunluluğu
- Refresh token rotation
- Brute-force koruması
- KVKK uyumluluğu

## 23. Geliştirme prensipleri

Projede şu prensipler izlenmelidir:

- Küçük ve anlamlı commit'ler
- Açıklayıcı commit mesajları
- Her veritabanı değişikliğinde migration
- Hassas bilgileri repository'ye eklememe
- Controller'ları zamanla inceltme
- İş kurallarını Application katmanına taşıma
- Entity sınıflarını sade tutma
- Tekrarlanan kodları servisleştirme
- Endpoint'leri test etmeden commit atmama
- Her büyük kilometre taşında dokümantasyonu güncelleme

## 24. İleride yapılacak mimari iyileştirmeler

- Global exception middleware
- Result pattern
- FluentValidation
- API versioning paketi
- Refresh token
- Permission authorization handler
- Repository veya query service yaklaşımı
- CQRS
- MediatR
- Background job altyapısı
- Redis cache
- Distributed lock
- Observability
- Structured logging
- Health checks
- Integration tests
- Unit tests
- Docker ile API dağıtımı
- CI/CD pipeline