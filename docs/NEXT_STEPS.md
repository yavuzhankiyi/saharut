# Saharut Sonraki Geliştirme Adımları

Bu doküman, Saharut projesinde sıradaki teknik işleri öncelik sırasına göre takip etmek için kullanılır.

Son güncelleme: 11 Temmuz 2026

## 1. Sıradaki görev: rol bazlı yetkilendirme

Mevcut durumda kullanıcılar OTP ile giriş yapabiliyor ve JWT access token alabiliyor.

JWT içine kullanıcı rolleri eklenmektedir.

Sıradaki amaç, yönetim endpoint'lerini kullanıcı rollerine göre korumaktır.

### Yetki planı

#### SUPER_ADMIN

Tüm yönetim endpoint'lerine erişebilir.

```text
Companies
Users
Roles
System settings
Reports
Integrations
```

#### OPERATIONS_MANAGER

Operasyonla ilgili yönetim endpoint'lerine erişebilir.

```text
Companies
Users
Roles görüntüleme
Orders
Stores
Visits
Reports
```

#### MANUFACTURER_MANAGER

Yalnızca kendi firmasına ait verileri yönetebilir.

```text
Products
Campaigns
Orders
Reports
Company users
```

#### DISTRIBUTOR_MANAGER

Dağıtım ve sipariş operasyonlarını yönetebilir.

```text
Assigned orders
Deliveries
Collections
Distribution reports
```

#### FIELD_SALES

Mobil saha işlemlerini kullanabilir.

```text
Assigned stores
Visit plans
Visits
Orders
Wallet
Training
```

#### FINANCE_MANAGER

Finansal kayıtları ve prim süreçlerini yönetebilir.

```text
Wallets
Rewards
Collections
Payments
Financial reports
```

### İlk uygulanacak controller yetkileri

`CompaniesController` sınıfı:

```csharp
[Authorize(Roles = "SUPER_ADMIN,OPERATIONS_MANAGER")]
```

`UsersController` sınıfı:

```csharp
[Authorize(Roles = "SUPER_ADMIN,OPERATIONS_MANAGER")]
```

`RolesController` sınıfı:

```csharp
[Authorize(Roles = "SUPER_ADMIN")]
```

Rol listeleme ileride operasyon yöneticisine ayrıca açılabilir.

### Test senaryoları

- Token olmadan endpoint çağrısı `401 Unauthorized` dönmeli.
- Geçerli token ancak yanlış rolle çağrı yapılırsa `403 Forbidden` dönmeli.
- `SUPER_ADMIN` token ile yönetim endpoint'leri çalışmalı.
- `OPERATIONS_MANAGER` token ile izin verilen endpoint'ler çalışmalı.
- `FIELD_SALES` token ile yönetim endpoint'leri `403 Forbidden` dönmeli.

## 2. Kullanıcı yönetimini tamamlama

Şu anda kullanıcı ekleme, listeleme ve tek kullanıcı görüntüleme bulunmaktadır.

Eklenecek işlemler:

```text
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}
POST   /api/v1/users/{id}/roles
DELETE /api/v1/users/{id}/roles/{roleId}
POST   /api/v1/users/{id}/companies
DELETE /api/v1/users/{id}/companies/{companyId}
```

### Kullanıcı güncellemede desteklenecek alanlar

```text
FirstName
LastName
PhoneNumber
Email
IsActive
```

### Kullanıcı silme yaklaşımı

Fiziksel silme yapılmamalıdır.

```text
IsDeleted = true
IsActive = false
UpdatedAt = DateTime.UtcNow
```

Kullanıcının aktif OTP kayıtları geçersiz yapılmalıdır.

## 3. Rol yönetimini tamamlama

Şu anda rol ekleme ve listeleme vardır.

Eklenecek işlemler:

```text
GET    /api/v1/roles/{id}
PUT    /api/v1/roles/{id}
DELETE /api/v1/roles/{id}
```

Sistem rollerinin yanlışlıkla silinmesini önlemek için koruma eklenmelidir.

Örnek sistem rolleri:

```text
SUPER_ADMIN
OPERATIONS_MANAGER
MANUFACTURER_MANAGER
DISTRIBUTOR_MANAGER
FIELD_SALES
FINANCE_MANAGER
```

## 4. Permission altyapısı

Rol bazlı yetkilendirme tamamlandıktan sonra permission tabanlı yapı kurulacaktır.

### Yeni entity sınıfları

```text
Permission
RolePermission
```

### Permission alanları

```text
Id
Name
Code
Description
Module
IsActive
CreatedAt
UpdatedAt
IsDeleted
```

### RolePermission alanları

```text
Id
RoleId
PermissionId
CreatedAt
UpdatedAt
IsDeleted
```

### Örnek permission kodları

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
Roles.Create
Roles.Update
Roles.Delete

Products.View
Products.Create
Products.Update
Products.Delete

Orders.View
Orders.Create
Orders.Approve
Orders.Cancel

Campaigns.View
Campaigns.Create
Campaigns.Update
Campaigns.Delete

Wallet.View
Wallet.Manage

Reports.View
Reports.Export
```

### Planlanan authorization kullanımı

```csharp
[HasPermission("Companies.Create")]
```

Bunun için custom authorization attribute, policy provider ve authorization handler geliştirilecektir.

## 5. Refresh token altyapısı

Access token süresi bittikten sonra kullanıcının tekrar OTP girmeden oturumunu yenileyebilmesi için refresh token desteği eklenecektir.

### RefreshToken entity

```text
Id
UserId
TokenHash
ExpiresAt
CreatedAt
RevokedAt
ReplacedByTokenId
CreatedByIp
RevokedByIp
IsRevoked
IsDeleted
```

### Endpoint'ler

```text
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
```

### Güvenlik kuralları

- Refresh token açık şekilde veritabanında saklanmamalıdır.
- Token hashlenerek tutulmalıdır.
- Token rotation uygulanmalıdır.
- Kullanılmış token yeniden kullanılırsa token ailesi iptal edilmelidir.
- Kullanıcı pasifse yeni access token üretilmemelidir.
- Çıkış işleminde refresh token iptal edilmelidir.

## 6. OTP sistemini geliştirme

Mevcut OTP sistemi geliştirme ortamında çalışmaktadır.

Eklenecek iyileştirmeler:

- Gerçek SMS sağlayıcısı entegrasyonu
- Telefon numarası standardizasyonu
- Türkiye telefon numarası doğrulaması
- Saatlik ve günlük OTP gönderim sınırı
- IP bazlı rate limit
- Kullanıcı bazlı rate limit
- OTP gönderim logları
- Başarısız SMS gönderimi tekrar deneme
- SMS maliyet raporu
- Geliştirme kodunun production ortamında kesinlikle dönmemesi

### Telefon standardı

Veritabanında telefon numaralarının tek formatta saklanması planlanmaktadır.

Örnek:

```text
+905551112233
```

## 7. Global exception handling

Controller içindeki tekrar eden hata yönetimlerini azaltmak için global exception middleware oluşturulacaktır.

### Planlanan response yapısı

```json
{
  "success": false,
  "message": "Beklenmeyen bir hata oluştu.",
  "traceId": "request-trace-id"
}
```

Development ortamında teknik hata ayrıntıları gösterilebilir.

Production ortamında stack trace kullanıcıya dönülmemelidir.

## 8. Request validation

FluentValidation kullanılması planlanmaktadır.

### İlk validator sınıfları

```text
CreateCompanyRequestValidator
UpdateCompanyRequestValidator
CreateUserRequestValidator
UpdateUserRequestValidator
CreateRoleRequestValidator
SendOtpRequestValidator
VerifyOtpRequestValidator
```

### Örnek kurallar

```text
Firma adı zorunlu
Firma adı en fazla 200 karakter
Vergi numarası uygun uzunlukta
E-posta geçerli formatta
Telefon numarası geçerli formatta
Rol kodu yalnızca büyük harf ve alt çizgi
OTP kodu tam altı haneli
```

## 9. API response standardı

Endpoint cevapları ortak yapıya taşınacaktır.

### Başarılı cevap

```json
{
  "success": true,
  "message": "İşlem başarılı.",
  "data": {}
}
```

### Hatalı cevap

```json
{
  "success": false,
  "message": "İşlem başarısız.",
  "errors": []
}
```

### Sayfalı cevap

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

## 10. Sayfalama, arama ve filtreleme

Firma, kullanıcı, ürün ve sipariş listelerinde sayfalama kullanılacaktır.

Örnek:

```text
GET /api/v1/users?page=1&pageSize=20&search=yavuzhan&isActive=true
```

### Ortak kurallar

- Varsayılan sayfa: `1`
- Varsayılan sayfa boyutu: `20`
- Maksimum sayfa boyutu: `100`
- Arama büyük-küçük harf duyarsız olmalı
- Sıralama alanları kontrollü olmalı
- Kullanıcıdan gelen doğrudan kolon adı sorguya uygulanmamalı

## 11. Audit log altyapısı

Önemli işlemler kayıt altına alınacaktır.

### AuditLog alanları

```text
Id
UserId
Action
EntityType
EntityId
OldValues
NewValues
IpAddress
UserAgent
CreatedAt
```

### Kaydedilecek işlemler

```text
User created
User updated
User deleted
Role assigned
Role removed
Company created
Company updated
Company deleted
Order approved
Order cancelled
Campaign created
Wallet transaction created
System setting changed
```

## 12. Next.js web paneli

Backend yönetim altyapısı yeterli seviyeye geldiğinde web paneli oluşturulacaktır.

### Kurulum

```powershell
cd "C:\Users\90542\OneDrive - ogr.sakarya.edu.tr\Masaüstü\Saharut"

npx create-next-app@latest web-panel
```

Seçenekler:

```text
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src directory: Yes
App Router: Yes
Turbopack: Yes
Import alias customization: No
```

### İlk ekranlar

```text
Login
OTP verification
Dashboard
Companies
Users
Roles
Products
Orders
Campaigns
Reports
Settings
```

### İlk frontend görevi

```text
Telefon numarası giriş ekranı
OTP doğrulama ekranı
JWT token saklama
/api/v1/auth/me çağrısı
Korumalı panel layout
```

## 13. CORS yapılandırması

Next.js paneli API'ye bağlanırken CORS yapılandırılacaktır.

Development ortamı:

```text
http://localhost:3000
```

Production ortamı:

```text
https://panel.saharut.com
https://admin.saharut.com
```

Tüm origin'lere açık CORS kullanılmamalıdır.

## 14. Ürün modülü

Kimlik ve yetkilendirme altyapısından sonra ilk iş modülü ürün yönetimi olacaktır.

### Entity sınıfları

```text
ProductCategory
Product
ProductImage
ProductPrice
ProductStock
```

### ProductCategory

```text
Id
CompanyId
Name
Description
ParentCategoryId
IsActive
CreatedAt
UpdatedAt
IsDeleted
```

### Product

```text
Id
CompanyId
CategoryId
Name
Sku
Barcode
Description
Unit
IsActive
CreatedAt
UpdatedAt
IsDeleted
```

### ProductPrice

```text
Id
ProductId
Price
Currency
ValidFrom
ValidUntil
CreatedAt
UpdatedAt
IsDeleted
```

### ProductStock

```text
Id
ProductId
Quantity
ReservedQuantity
UpdatedAt
```

### İlk endpoint'ler

```text
GET    /api/v1/product-categories
POST   /api/v1/product-categories
PUT    /api/v1/product-categories/{id}
DELETE /api/v1/product-categories/{id}

GET    /api/v1/products
GET    /api/v1/products/{id}
POST   /api/v1/products
PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}
```

## 15. Satış noktası modülü

### Entity sınıfları

```text
Store
StoreAddress
StoreContact
StoreAssignment
Region
```

### Temel alanlar

```text
Store Name
Tax Number
Phone
Email
Address
Latitude
Longitude
Assigned Field User
Region
IsActive
```

### İlk özellikler

- Satış noktası ekleme
- Harita koordinatı kaydetme
- Saha personeline atama
- Bölgeye göre listeleme
- Yakındaki satış noktalarını sorgulama
- Satış noktası geçmişini görüntüleme

PostGIS bu modülde devreye alınabilir.

## 16. Ziyaret modülü

### Entity sınıfları

```text
VisitPlan
Visit
VisitPhoto
VisitResult
```

### Ziyaret akışı

```text
Ziyaret planlandı
Ziyaret başlatıldı
Konum doğrulandı
Not veya fotoğraf eklendi
Sipariş oluşturuldu veya alınamadı nedeni seçildi
Ziyaret tamamlandı
```

### Ziyaret alanları

```text
UserId
StoreId
StartTime
EndTime
StartLatitude
StartLongitude
EndLatitude
EndLongitude
Status
NoOrderReason
Notes
```

## 17. Sipariş modülü

### Entity sınıfları

```text
Order
OrderItem
OrderStatusHistory
OrderNote
OrderAssignment
```

### İlk sipariş durumları

```text
Draft
OtpConfirmed
PendingApproval
Approved
Preparing
OutForDelivery
Delivered
CollectionConfirmed
Completed
Rejected
Cancelled
PartiallyDelivered
Returned
```

### İlk endpoint'ler

```text
POST /api/v1/orders
GET  /api/v1/orders
GET  /api/v1/orders/{id}
POST /api/v1/orders/{id}/confirm
POST /api/v1/orders/{id}/approve
POST /api/v1/orders/{id}/reject
POST /api/v1/orders/{id}/cancel
POST /api/v1/orders/{id}/status
```

Her durum değişikliği `OrderStatusHistory` tablosuna kaydedilmelidir.

## 18. Kampanya ve prim modülü

### Entity sınıfları

```text
Campaign
CampaignRule
CampaignProduct
CampaignParticipant
CampaignProgress
Reward
```

### İlk kampanya tipleri

```text
Belirli miktar satış yap, sabit prim kazan
Belirli üründen X adet sat, Y TL prim kazan
```

### İlk kurallar

- Kampanya başlangıç ve bitiş tarihi olmalı.
- Kampanya belirli firmalara veya kullanıcılara atanabilmeli.
- Sadece teslim edilmiş veya tahsilatı onaylanmış siparişler hesaba katılmalı.
- Prim hesaplamaları tekrar çalıştırıldığında çift kayıt oluşmamalı.

## 19. Cüzdan modülü

### Entity sınıfları

```text
Wallet
WalletTransaction
```

### İşlem türleri

```text
Reward
Payment
Adjustment
Reversal
Refund
```

### Muhasebe yaklaşımı

Mevcut finansal işlem değiştirilmemelidir.

Yanlış işlem oluşursa ters kayıt eklenmelidir.

```text
Original transaction
        |
        v
Reversal transaction
```

## 20. Test altyapısı

### Unit test

Planlanan proje:

```text
Saharut.UnitTests
```

### Integration test

Planlanan proje:

```text
Saharut.IntegrationTests
```

### İlk test edilecek alanlar

- OTP hash kontrolü
- OTP süre kontrolü
- OTP hatalı deneme sınırı
- JWT claim üretimi
- Rol bazlı yetkilendirme
- Firma CRUD
- Kullanıcı oluşturma transaction'ı
- Soft delete filtreleri

## 21. CI/CD

GitHub Actions ile otomatik kontrol kurulacaktır.

### İlk workflow

Her push ve pull request işleminde:

```text
dotnet restore
dotnet build
dotnet test
```

İleride:

```text
Docker image build
Security scan
Migration validation
Deployment
```

eklenecektir.

## 22. Hosting ve domain

Planlanan domain yapısı:

```text
saharut.com
www.saharut.com
panel.saharut.com
admin.saharut.com
api.saharut.com
cdn.saharut.com
docs.saharut.com
```

İlk production hedefi:

```text
panel.saharut.com
api.saharut.com
```

### Planlanan sunucu yapısı

```text
Cloudflare
    |
Nginx
    |
Docker
├── ASP.NET Core API
├── Next.js Panel
├── PostgreSQL
└── Redis
```

## 23. Commit planı

Aşağıdaki kilometre taşlarında commit atılmalıdır:

### Kimlik doğrulama

```text
feat: add role based authorization
feat: add permission based authorization
feat: add refresh token support
```

### Kullanıcı yönetimi

```text
feat: complete user management endpoints
feat: add company and role assignment endpoints
```

### Kalite altyapısı

```text
feat: add global exception handling
feat: add request validation
feat: standardize API responses
```

### Web paneli

```text
feat: initialize Next.js management panel
feat: add OTP login flow to web panel
feat: add protected dashboard layout
```

### İş modülleri

```text
feat: add product and category management
feat: add store management
feat: add visit management
feat: add order management
feat: add campaign and reward management
```

## 24. Hemen sonraki çalışma sırası

En yakın geliştirme sırası:

```text
1. Rol bazlı yetkilendirme
2. Kullanıcı güncelleme ve soft delete
3. Rol güncelleme ve soft delete
4. Permission altyapısı
5. Refresh token
6. Global exception handling
7. FluentValidation
8. API response standardı
9. Next.js panel kurulumu
10. OTP giriş ekranı
11. Ürün ve kategori modülü
```

## 25. Yeni sohbet için kontrol listesi

Yeni bir sohbet başladığında:

1. Repository bağlantısını paylaş.
2. `main` branch'in kullanılacağını belirt.
3. `README.md` dosyasını incelet.
4. `docs/PROJECT_STATUS.md` dosyasını incelet.
5. `docs/ARCHITECTURE.md` dosyasını incelet.
6. `docs/NEXT_STEPS.md` dosyasını incelet.
7. Son commit'i kontrol ettir.
8. Yerel değişiklik varsa `git status` çıktısını paylaş.
9. Sıradaki görevi net biçimde belirt.

Örnek başlangıç mesajı:

```text
https://github.com/yavuzhankiyi/saharut reposundaki Saharut projesine devam ediyoruz.

main branch'i incele. Önce README.md, docs/PROJECT_STATUS.md, docs/ARCHITECTURE.md ve docs/NEXT_STEPS.md dosyalarını oku.

Son tamamlanan özellik OTP + JWT kimlik doğrulama ve GET /api/v1/auth/me endpoint'i.

Sıradaki görev rol bazlı yetkilendirme. Mevcut mimariyi bozmadan küçük adımlarla ilerle ve her terminal komutundan önce hangi klasöre geçileceğini belirt.
```