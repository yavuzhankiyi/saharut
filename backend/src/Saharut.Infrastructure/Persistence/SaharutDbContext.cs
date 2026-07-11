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

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<CompanyUser> CompanyUsers => Set<CompanyUser>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureCompany(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureRole(modelBuilder);
        ConfigureUserRole(modelBuilder);
        ConfigureCompanyUser(modelBuilder);
        ConfigureOtpCode(modelBuilder);
    }

    private static void ConfigureCompany(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("companies");

            entity.HasKey(company => company.Id);

            entity.Property(company => company.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(company => company.TaxNumber)
                .HasMaxLength(20);

            entity.Property(company => company.PhoneNumber)
                .HasMaxLength(30);

            entity.Property(company => company.Email)
                .HasMaxLength(200);

            entity.HasIndex(company => company.Name);
            entity.HasIndex(company => company.TaxNumber);
        });
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(user => user.Id);

            entity.Property(user => user.FirstName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user => user.LastName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user => user.PhoneNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(user => user.Email)
                .HasMaxLength(200);

            entity.HasIndex(user => user.PhoneNumber)
                .IsUnique();

            entity.HasIndex(user => user.Email);
        });
    }

    private static void ConfigureRole(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");

            entity.HasKey(role => role.Id);

            entity.Property(role => role.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(role => role.Code)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(role => role.Description)
                .HasMaxLength(500);

            entity.HasIndex(role => role.Code)
                .IsUnique();
        });
    }

    private static void ConfigureUserRole(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_roles");

            entity.HasKey(userRole => userRole.Id);

            entity.HasIndex(userRole => new
            {
                userRole.UserId,
                userRole.RoleId
            }).IsUnique();

            entity.HasOne(userRole => userRole.User)
                .WithMany(user => user.UserRoles)
                .HasForeignKey(userRole => userRole.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(userRole => userRole.Role)
                .WithMany(role => role.UserRoles)
                .HasForeignKey(userRole => userRole.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureCompanyUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CompanyUser>(entity =>
        {
            entity.ToTable("company_users");

            entity.HasKey(companyUser => companyUser.Id);

            entity.HasIndex(companyUser => new
            {
                companyUser.CompanyId,
                companyUser.UserId
            }).IsUnique();

            entity.HasOne(companyUser => companyUser.Company)
                .WithMany(company => company.CompanyUsers)
                .HasForeignKey(companyUser => companyUser.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(companyUser => companyUser.User)
                .WithMany(user => user.CompanyUsers)
                .HasForeignKey(companyUser => companyUser.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureOtpCode(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OtpCode>(entity =>
        {
            entity.ToTable("otp_codes");

            entity.HasKey(otpCode => otpCode.Id);

            entity.Property(otpCode => otpCode.PhoneNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(otpCode => otpCode.CodeHash)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(otpCode => otpCode.IpAddress)
                .HasMaxLength(100);

            entity.HasIndex(otpCode => otpCode.PhoneNumber);

            entity.HasIndex(otpCode => new
            {
                otpCode.PhoneNumber,
                otpCode.IsUsed,
                otpCode.ExpiresAt
            });
        });
    }
}