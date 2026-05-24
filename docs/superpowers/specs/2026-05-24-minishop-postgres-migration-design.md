# MiniShop Postgres Migration Design

Date: 2026-05-24
Status: Proposed
Scope: Chuyen MiniShop tu SQLite sang PostgreSQL-first runtime, dung Docker Compose cho local DB, giu app chay tren host, va dung `DATABASE_URL` external khi deploy.

## 1. Muc tieu

- Bo runtime SQLite hien tai.
- Chuyen Prisma datasource sang `postgresql`.
- Dung `docker compose` de cap local Postgres on dinh cho dev.
- Giu `npm run dev` tren may host de DX don gian.
- Deploy len host bat ky bang cach tro `DATABASE_URL` toi Postgres ben ngoai.
- Bo lich su migration SQLite, tao lai mot migration goc moi cho PostgreSQL.
- Reset demo data bang migrate + seed, khong can migrate du lieu tu file SQLite cu.

## 2. Rang buoc

- Giu JavaScript, Next.js App Router, Prisma, seed flow hien tai.
- Khong duy tri dual-mode SQLite/Postgres trong cung repo.
- Khong dong goi app vao Docker o phase nay.
- Khong viet script migrate data tu SQLite sang Postgres.
- Khong giu tuong thich voi SQL migration cu da sinh cho SQLite.

## 3. Hien trang anh huong

- `prisma/schema.prisma` dang dung `provider = "sqlite"`.
- `.env` va `.env.example` dang tro `DATABASE_URL="file:./dev.db"`.
- `prisma/migrate.mjs` dang xoa `prisma/dev.db` va shell-out sang `sqlite3`.
- `docs/deploy/production-readiness.md` va `README.md` dang mo ta repo theo huong SQLite-first.
- Seed va test chinh yeu di qua Prisma Client, nen kha nang tai su dung sau khi doi datasource la cao.

## 4. Giai phap duoc chon

### 4.1 Runtime database

Toan bo repo chuyen sang PostgreSQL-first:

- Local: Postgres chay bang `docker compose`.
- App: chay tren host bang `npm run dev`.
- Deploy: app dung `DATABASE_URL` cua Postgres duoc quan ly ben ngoai.

Ly do:

- Local va production cung mot loai database, giam sai lech hanh vi.
- Khong phai duy tri hai bo docs, scripts, migration semantics.
- Van giu DX tot vi chi container hoa DB, khong container hoa ca app.

### 4.2 Migration strategy

Khong chuyen doi SQL migration SQLite cu. Thay vao do:

- Xoa lich su migration hien tai trong `prisma/migrations/`.
- Tao mot migration goc moi cho Postgres dua tren schema hien tai.
- Cac thay doi schema ve sau dung `prisma migrate dev` trong local va `prisma migrate deploy` khi deploy.

Ly do:

- SQL sinh cho SQLite khong nen coi la portable sang Postgres.
- Repo hoc tap nay uu tien migration story ro rang hon la bao ton lich su engine cu.

### 4.3 Local database workflow

Them `docker-compose.yml` voi 1 service `postgres`:

- image `postgres:16-alpine`
- port `5432:5432`
- named volume de giu du lieu local
- healthcheck de biet DB san sang

Workflow local muc tieu:

```bash
docker compose up -d
cp .env.example .env
npm run db:reset:demo
npm run dev
```

Khi can dung DB local:

```bash
docker compose down
```

Neu can xoa ca volume local:

```bash
docker compose down -v
```

### 4.4 Scripts va env

Repo se bo logic `sqlite3` CLI va chuyen sang Prisma-native commands.

Scripts muc tieu:

- `db:up` -> `docker compose up -d`
- `db:down` -> `docker compose down`
- `db:generate` -> `prisma generate`
- `db:migrate` -> `prisma migrate dev`
- `db:migrate:deploy` -> `prisma migrate deploy`
- `db:seed` -> giu `node prisma/seed.mjs`
- `db:reset:demo` -> `prisma migrate reset --force` + seed lai demo data

`DATABASE_URL` mac dinh local:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minishop?schema=public"
```

Production se khong dung compose file. Deploy chi can set:

- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `AUTH_SECRET`

## 5. Thay doi file/chuc nang

### 5.1 Prisma

- `prisma/schema.prisma`
  - doi datasource provider sang `postgresql`
- `prisma/migrations/`
  - bo folder migration SQLite cu
  - tao migration goc moi cho Postgres
- `prisma/migrate.mjs`
  - xoa han vi khong con gia tri sau khi bo SQLite reset flow

### 5.2 Local infrastructure

- `docker-compose.yml`
  - khai bao service `postgres`
  - volume persistence
  - healthcheck

### 5.3 App/runtime config

- `.env.example`
  - cap nhat Postgres URL local
- `README.md`
  - viet lai local setup sang Postgres-first
- `docs/deploy/production-readiness.md`
  - viet lai deployment checklist cho external Postgres
- `package.json`
  - bo script phu thuoc SQLite
  - them script phuc vu local DB bang compose

### 5.4 Tests va CI

- Unit/integration tests hien co du kien van dung duoc neu DB da duoc setup bang Postgres.
- Neu CI dang ngam dinh SQLite reset flow, can doi sang compose Postgres + migrate + seed.
- E2E smoke flow neu co se phai dung Postgres local thay cho `dev.db`.

## 6. Data flow sau khi chuyen

### 6.1 Local dev

1. Dev start Postgres bang `docker compose up -d`.
2. App doc `DATABASE_URL` tro toi `localhost:5432`.
3. `npm run db:reset:demo` reset schema local Postgres, apply migrations, seed lai data demo.
4. Next.js pages, route handlers, server actions tiep tuc dung Prisma Client nhu cu.

### 6.2 Production deploy

1. Host/app platform inject `DATABASE_URL` cua Postgres external.
2. Release step chay `npm run db:migrate:deploy`.
3. Runtime app ket noi truc tiep toi Postgres external.
4. Khong co lenh destructive reset/seed trong prod checklist mac dinh.

## 7. Error handling va guardrails

- Neu Postgres container chua san sang, `db:migrate`, `db:reset:demo`, `dev`, `build` co the fail som voi Prisma connection error. Docs phai chi ro can `docker compose up -d` truoc.
- `db:reset:demo` phai duoc document ro la local-only, destructive.
- Production docs phai canh bao khong chay seed/reset vao DB that.
- App van tiep tuc bat buoc `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET` theo env guardrails da co.

## 8. Testing strategy

- Xac minh `prisma generate`, `prisma migrate dev`, `prisma migrate deploy`, `db:reset:demo` deu chay voi Postgres local.
- Chay `npm run test` de xac nhan code dung Prisma APIs van on.
- Chay `npm run build` de xac nhan render/build paths khong phu thuoc SQLite.
- Neu Playwright/CI co mat, chay smoke flow tren Postgres local sau reset seed.

## 9. Trade-off

Loi ich:

- Giong production hon.
- Docs deploy ro rang hon.
- Bo duoc custom SQLite migration script de vo.

Chi phi:

- Mat flow `dev.db` sieu nhe cho nguoi hoc moi.
- Can Docker local.
- Migration history bi cat doi tu ngay chuyen engine.

Chap nhan vi muc tieu hien tai la san sang deploy thuc te hon la giu demo SQLite.

## 10. Out of scope

- Dockerize app runtime.
- Data migration tu SQLite sang Postgres.
- Multi-environment compose stacks.
- Postgres failover, backups, pooling, SSL tuning.
- Tach rieng seed cho staging/production.

## 11. Tieu chi hoan thanh

- Prisma datasource dung `postgresql`.
- Repo co `docker-compose.yml` chay duoc local Postgres.
- Local setup docs khong con nhac `sqlite3` hay `dev.db`.
- Migration history moi duoc tao cho Postgres.
- `db:reset:demo` dung Postgres va seed thanh cong.
- Deploy docs mo ta ro viec dung external `DATABASE_URL`.
