using Microsoft.EntityFrameworkCore;
using Saharut.Domain.Entities;

namespace Saharut.Infrastructure.Persistence;

public sealed class SaharutDbContext : DbContext
{
    public SaharutDbContext(
        DbContextOptions<SaharutDbContext> options
    ) : base(options)
    {
    }

    public DbSet<Company> Companies =>
        Set<Company>();

    public DbSet<User> Users =>
        Set<User>();

    public DbSet<Role> Roles =>
        Set<Role>();

    public DbSet<UserRole> UserRoles =>
        Set<UserRole>();

    public DbSet<CompanyUser> CompanyUsers =>
        Set<CompanyUser>();

    public DbSet<OtpCode> OtpCodes =>
        Set<OtpCode>();

    public DbSet<Permission> Permissions =>
        Set<Permission>();

    public DbSet<RolePermission> RolePermissions =>
        Set<RolePermission>();

    public DbSet<AuditLog> AuditLogs =>
        Set<AuditLog>();

    public DbSet<Product> Products =>
        Set<Product>();

    public DbSet<Customer> Customers =>
        Set<Customer>();

    public DbSet<Visit> Visits =>
    Set<Visit>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureCompany(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureRole(modelBuilder);
        ConfigureUserRole(modelBuilder);
        ConfigureCompanyUser(modelBuilder);
        ConfigureOtpCode(modelBuilder);
        ConfigurePermission(modelBuilder);
        ConfigureRolePermission(modelBuilder);
        ConfigureAuditLog(modelBuilder);
        ConfigureProduct(modelBuilder);
        ConfigureVisit(modelBuilder);
        
    }

    private static void ConfigureCompany(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("companies");

            entity.HasKey(company =>
                company.Id);

            entity.Property(company =>
                    company.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(company =>
                    company.TaxNumber)
                .HasMaxLength(20);

            entity.Property(company =>
                    company.PhoneNumber)
                .HasMaxLength(30);

            entity.Property(company =>
                    company.Email)
                .HasMaxLength(200);

            entity.HasIndex(company =>
                company.Name);

            entity.HasIndex(company =>
                company.TaxNumber);
        });
    }

    private static void ConfigureUser(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(user =>
                user.Id);

            entity.Property(user =>
                    user.FirstName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user =>
                    user.LastName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user =>
                    user.PhoneNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(user =>
                    user.Email)
                .HasMaxLength(200);

            entity.HasIndex(user =>
                    user.PhoneNumber)
                .IsUnique();

            entity.HasIndex(user =>
                user.Email);
        });
    }

    private static void ConfigureRole(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");

            entity.HasKey(role =>
                role.Id);

            entity.Property(role =>
                    role.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(role =>
                    role.Code)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(role =>
                    role.Description)
                .HasMaxLength(500);

            entity.HasIndex(role =>
                    role.Code)
                .IsUnique();
        });
    }

    private static void ConfigureUserRole(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_roles");

            entity.HasKey(userRole =>
                userRole.Id);

            entity.HasIndex(userRole => new
            {
                userRole.UserId,
                userRole.RoleId
            }).IsUnique();

            entity.HasOne(userRole =>
                    userRole.User)
                .WithMany(user =>
                    user.UserRoles)
                .HasForeignKey(userRole =>
                    userRole.UserId)
                .OnDelete(
                    DeleteBehavior.Restrict);

            entity.HasOne(userRole =>
                    userRole.Role)
                .WithMany(role =>
                    role.UserRoles)
                .HasForeignKey(userRole =>
                    userRole.RoleId)
                .OnDelete(
                    DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCompanyUser(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CompanyUser>(entity =>
        {
            entity.ToTable("company_users");

            entity.HasKey(companyUser =>
                companyUser.Id);

            entity.HasIndex(companyUser => new
            {
                companyUser.CompanyId,
                companyUser.UserId
            }).IsUnique();

            entity.HasOne(companyUser =>
                    companyUser.Company)
                .WithMany(company =>
                    company.CompanyUsers)
                .HasForeignKey(companyUser =>
                    companyUser.CompanyId)
                .OnDelete(
                    DeleteBehavior.Restrict);

            entity.HasOne(companyUser =>
                    companyUser.User)
                .WithMany(user =>
                    user.CompanyUsers)
                .HasForeignKey(companyUser =>
                    companyUser.UserId)
                .OnDelete(
                    DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureOtpCode(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OtpCode>(entity =>
        {
            entity.ToTable("otp_codes");

            entity.HasKey(otpCode =>
                otpCode.Id);

            entity.Property(otpCode =>
                    otpCode.PhoneNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(otpCode =>
                    otpCode.CodeHash)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(otpCode =>
                    otpCode.IpAddress)
                .HasMaxLength(100);

            entity.HasIndex(otpCode =>
                otpCode.PhoneNumber);

            entity.HasIndex(otpCode => new
            {
                otpCode.PhoneNumber,
                otpCode.IsUsed,
                otpCode.ExpiresAt
            });
        });
    }

    private static void ConfigurePermission(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.ToTable("permissions");

            entity.HasKey(permission =>
                permission.Id);

            entity.Property(permission =>
                    permission.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(permission =>
                    permission.Code)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(permission =>
                    permission.Module)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(permission =>
                    permission.Description)
                .HasMaxLength(500);

            entity.HasIndex(permission =>
                    permission.Code)
                .IsUnique();

            entity.HasIndex(permission =>
                permission.Module);
        });
    }

    private static void ConfigureRolePermission(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("role_permissions");

            entity.HasKey(rolePermission =>
                rolePermission.Id);

            entity.HasIndex(rolePermission => new
            {
                rolePermission.RoleId,
                rolePermission.PermissionId
            }).IsUnique();

            entity.HasOne(rolePermission =>
                    rolePermission.Role)
                .WithMany(role =>
                    role.RolePermissions)
                .HasForeignKey(rolePermission =>
                    rolePermission.RoleId)
                .OnDelete(
                    DeleteBehavior.Restrict);

            entity.HasOne(rolePermission =>
                    rolePermission.Permission)
                .WithMany(permission =>
                    permission.RolePermissions)
                .HasForeignKey(rolePermission =>
                    rolePermission.PermissionId)
                .OnDelete(
                    DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureAuditLog(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");

            entity.HasKey(auditLog =>
                auditLog.Id);

            entity.Property(auditLog =>
                    auditLog.EntityName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(auditLog =>
                    auditLog.EntityId)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(auditLog =>
                    auditLog.Action)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(auditLog =>
                    auditLog.UserDisplayName)
                .HasMaxLength(250);

            entity.Property(auditLog =>
                    auditLog.HttpMethod)
                .HasMaxLength(20);

            entity.Property(auditLog =>
                    auditLog.RequestPath)
                .HasMaxLength(500);

            entity.Property(auditLog =>
                    auditLog.IpAddress)
                .HasMaxLength(100);

            entity.Property(auditLog =>
                    auditLog.OldValues)
                .HasColumnType("jsonb");

            entity.Property(auditLog =>
                    auditLog.NewValues)
                .HasColumnType("jsonb");

            entity.Property(auditLog =>
                    auditLog.ChangedColumns)
                .HasColumnType("jsonb");

            entity.HasIndex(auditLog =>
                auditLog.CreatedAt);

            entity.HasIndex(auditLog =>
                auditLog.UserId);

            entity.HasIndex(auditLog => new
            {
                auditLog.EntityName,
                auditLog.EntityId
            });

            entity.HasIndex(auditLog =>
                auditLog.Action);
        });
    }

    private static void ConfigureProduct(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");

            entity.HasKey(product =>
                product.Id);

            entity.Property(product =>
                    product.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(product =>
                    product.Code)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(product =>
                    product.Barcode)
                .HasMaxLength(100);

            entity.Property(product =>
                    product.Description)
                .HasMaxLength(1000);

            entity.Property(product =>
                    product.Unit)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(product =>
                    product.ListPrice)
                .HasPrecision(
                    18,
                    2);

            entity.Property(product =>
                    product.VatRate)
                .HasPrecision(
                    5,
                    2);

            entity.Property(product =>
                    product.StockQuantity)
                .HasPrecision(
                    18,
                    3);

            entity.Property(product =>
                    product.MinimumStockQuantity)
                .HasPrecision(
                    18,
                    3);

            entity.HasIndex(product => new
            {
                product.CompanyId,
                product.Code
            }).IsUnique();

            entity.HasIndex(product =>
                product.Barcode);

            entity.HasIndex(product =>
                product.Name);

            entity.HasIndex(product => new
            {
                product.CompanyId,
                product.IsActive
            });

            entity.HasOne(product =>
                    product.Company)
                .WithMany(company =>
                    company.Products)
                .HasForeignKey(product =>
                    product.CompanyId)
                .OnDelete(
                    DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCustomer(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("customers");

            entity.HasKey(customer =>
                customer.Id);

            entity.Property(customer =>
                    customer.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(customer =>
                    customer.Code)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(customer =>
                    customer.CustomerType)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(customer =>
                    customer.ContactName)
                .HasMaxLength(200);

            entity.Property(customer =>
                    customer.PhoneNumber)
                .HasMaxLength(30);

            entity.Property(customer =>
                    customer.Email)
                .HasMaxLength(200);

            entity.Property(customer =>
                    customer.TaxNumber)
                .HasMaxLength(50);

            entity.Property(customer =>
                    customer.City)
                .HasMaxLength(100);

            entity.Property(customer =>
                    customer.District)
                .HasMaxLength(100);

            entity.Property(customer =>
                    customer.Address)
                .HasMaxLength(1000);

            entity.Property(customer =>
                    customer.Latitude)
                .HasPrecision(
                    10,
                    7);

            entity.Property(customer =>
                    customer.Longitude)
                .HasPrecision(
                    10,
                    7);

            entity.Property(customer =>
                    customer.Notes)
                .HasMaxLength(2000);

            entity.Property(customer =>
                    customer.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.HasOne(customer =>
                    customer.Company)
                .WithMany(company =>
                    company.Customers)
                .HasForeignKey(customer =>
                    customer.CompanyId)
                .OnDelete(
                    DeleteBehavior.Restrict);

            entity.HasIndex(customer => new
            {
                customer.CompanyId,
                customer.Code
            })
            .IsUnique()
            .HasFilter(
                "\"IsDeleted\" = false");

            entity.HasIndex(customer =>
                customer.CompanyId);

            entity.HasIndex(customer =>
                customer.Name);

            entity.HasIndex(customer =>
                customer.PhoneNumber);

            entity.HasIndex(customer =>
                customer.TaxNumber);

            entity.HasIndex(customer =>
                customer.IsActive);

            entity.HasIndex(customer =>
                customer.IsDeleted);
        });
    }

    private static void ConfigureVisit(
    ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Visit>(entity =>
    {
        entity.ToTable("visits");

        entity.HasKey(visit =>
            visit.Id);

        entity.Property(visit =>
                visit.Title)
            .HasMaxLength(200)
            .IsRequired();

        entity.Property(visit =>
                visit.Purpose)
            .HasMaxLength(1000);

        entity.Property(visit =>
                visit.Status)
            .HasConversion<int>()
            .IsRequired();

        entity.Property(visit =>
                visit.CheckInLatitude)
            .HasPrecision(10, 7);

        entity.Property(visit =>
                visit.CheckInLongitude)
            .HasPrecision(10, 7);

        entity.Property(visit =>
                visit.CheckOutLatitude)
            .HasPrecision(10, 7);

        entity.Property(visit =>
                visit.CheckOutLongitude)
            .HasPrecision(10, 7);

        entity.Property(visit =>
                visit.Outcome)
            .HasMaxLength(2000);

        entity.Property(visit =>
                visit.Notes)
            .HasMaxLength(2000);

        entity.Property(visit =>
                visit.CancellationReason)
            .HasMaxLength(1000);

        entity.HasOne(visit =>
                visit.Company)
            .WithMany(company =>
                company.Visits)
            .HasForeignKey(visit =>
                visit.CompanyId)
            .OnDelete(
                DeleteBehavior.Restrict);

        entity.HasOne(visit =>
                visit.Customer)
            .WithMany(customer =>
                customer.Visits)
            .HasForeignKey(visit =>
                visit.CustomerId)
            .OnDelete(
                DeleteBehavior.Restrict);

        entity.HasOne(visit =>
                visit.AssignedUser)
            .WithMany(user =>
                user.AssignedVisits)
            .HasForeignKey(visit =>
                visit.AssignedUserId)
            .OnDelete(
                DeleteBehavior.Restrict);

        entity.HasIndex(visit =>
            visit.CompanyId);

        entity.HasIndex(visit =>
            visit.CustomerId);

        entity.HasIndex(visit =>
            visit.AssignedUserId);

        entity.HasIndex(visit =>
            visit.Status);

        entity.HasIndex(visit =>
            visit.PlannedStartAt);

        entity.HasIndex(visit => new
        {
            visit.CompanyId,
            visit.PlannedStartAt
        });

        entity.HasIndex(visit => new
        {
            visit.AssignedUserId,
            visit.PlannedStartAt
        });

        entity.HasIndex(visit =>
            visit.IsDeleted);
    });
}
}