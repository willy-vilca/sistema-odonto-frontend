$ErrorActionPreference = 'Stop'
$psqlExecutable = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$env:PGPASSWORD = 'admin'
$actualDatabase = & $psqlExecutable -h localhost -U postgres -d sistema_odontologo_test -Atc 'select current_database()'
if ($LASTEXITCODE -ne 0 -or $actualDatabase.Trim() -ne 'sistema_odontologo_test') { throw 'La preparación solo está autorizada en sistema_odontologo_test.' }
$sql = @'
TRUNCATE appointment_history,appointment,patient_contact,patient,installation_logo,audit_event,user_role,dentist_service,weekly_period,schedule_exception,dentist,dental_service,service_category,user_account;
UPDATE installation_profile SET display_name='Mi consultorio',time_zone='America/Lima',currency='PEN',patient_next_number=1,receipt_next_number=1,budget_next_number=1,version=0,logo_revision=0,brand_color='#215e4d',accent_color='#edf2e9',minimum_lead_minutes=0,appointment_gap_minutes=0;
UPDATE role_definition SET name=code,version=0;
DELETE FROM role_permission;
INSERT INTO role_permission(role_code,permission) VALUES ('ADMIN','SETTINGS_READ'),('ADMIN','SETTINGS_WRITE'),('ADMIN','USERS_READ'),('ADMIN','USERS_WRITE'),('ADMIN','ROLES_READ'),('ADMIN','ROLES_WRITE'),('ADMIN','DENTISTS_READ'),('ADMIN','DENTISTS_WRITE'),('ADMIN','SERVICES_READ'),('ADMIN','SERVICES_WRITE'),('ADMIN','SCHEDULES_READ'),('ADMIN','SCHEDULES_WRITE'),('ADMIN','AUDIT_READ'),('ADMIN','PATIENTS_READ'),('ADMIN','PATIENTS_WRITE'),('ADMIN','APPOINTMENTS_READ'),('ADMIN','APPOINTMENTS_WRITE');
INSERT INTO role_permission(role_code,permission) SELECT r.code,p.permission FROM role_definition r CROSS JOIN (VALUES ('SETTINGS_READ'),('DENTISTS_READ'),('SERVICES_READ'),('SCHEDULES_READ')) AS p(permission) WHERE r.code <> 'ADMIN';
INSERT INTO role_permission(role_code,permission) SELECT r.code,p.permission FROM role_definition r CROSS JOIN (VALUES ('PATIENTS_READ'),('APPOINTMENTS_READ')) p(permission) WHERE r.code <> 'ADMIN';
INSERT INTO role_permission(role_code,permission) VALUES ('RECEPTION','PATIENTS_WRITE'),('RECEPTION','APPOINTMENTS_WRITE');
'@
& $psqlExecutable -h localhost -U postgres -d sistema_odontologo_test -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación de la base de pruebas.' }
Remove-Item Env:PGPASSWORD
