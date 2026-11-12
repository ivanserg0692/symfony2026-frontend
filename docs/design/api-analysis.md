# Storefront API Analysis

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [English](#english)
  - [Evidence and verification scope](#evidence-and-verification-scope)
  - [Architecture](#architecture)
  - [Endpoint inventory](#endpoint-inventory)
  - [Response contracts](#response-contracts)
  - [Catalog semantics](#catalog-semantics)
  - [Access and business workflows](#access-and-business-workflows)
  - [Existing frontend](#existing-frontend)
  - [Safe local observations](#safe-local-observations)
  - [Gaps and implementation gates](#gaps-and-implementation-gates)
- [Русский](#%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9)
  - [Основания и границы проверки](#%D0%BE%D1%81%D0%BD%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F-%D0%B8-%D0%B3%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D1%8B-%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B8)
  - [Архитектура](#%D0%B0%D1%80%D1%85%D0%B8%D1%82%D0%B5%D0%BA%D1%82%D1%83%D1%80%D0%B0)
  - [Перечень endpoints](#%D0%BF%D0%B5%D1%80%D0%B5%D1%87%D0%B5%D0%BD%D1%8C-endpoints)
  - [Контракты ответов](#%D0%BA%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%BA%D1%82%D1%8B-%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D0%BE%D0%B2)
  - [Семантика каталога](#%D1%81%D0%B5%D0%BC%D0%B0%D0%BD%D1%82%D0%B8%D0%BA%D0%B0-%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3%D0%B0)
  - [Доступ и бизнес-сценарии](#%D0%B4%D0%BE%D1%81%D1%82%D1%83%D0%BF-%D0%B8-%D0%B1%D0%B8%D0%B7%D0%BD%D0%B5%D1%81-%D1%81%D1%86%D0%B5%D0%BD%D0%B0%D1%80%D0%B8%D0%B8)
  - [Существующий frontend](#%D1%81%D1%83%D1%89%D0%B5%D1%81%D1%82%D0%B2%D1%83%D1%8E%D1%89%D0%B8%D0%B9-frontend)
  - [Безопасные локальные проверки](#%D0%B1%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D1%8B%D0%B5-%D0%BB%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B8)
  - [Пробелы и условия реализации](#%D0%BF%D1%80%D0%BE%D0%B1%D0%B5%D0%BB%D1%8B-%D0%B8-%D1%83%D1%81%D0%BB%D0%BE%D0%B2%D0%B8%D1%8F-%D1%80%D0%B5%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D0%B8)

<!-- END doctoc -->

## English

### Evidence and verification scope

Investigation date: 2026-11-13. Sources were checked beyond Swagger: controllers, query/request DTOs, serializer groups, repositories, application services, voters, security configuration and Gateway routing. Ignored `vendor/` and `var/` code was not inspected. No login, POST/PATCH/DELETE business request, fixture, migration, build, installation or service startup was performed. Protected success paths were inspected in source, not exercised with an authenticated account.

Primary repository sources:

- [Gateway route manifest](../../../api-gateway/routes.json), [Nginx authentication](../../../api-gateway/nginx/api-gateway.conf), [combined OpenAPI](../../../symfony/public/api-gateway/openapi.json).
- [Auth controller](../../../symfony/src/Controller/Api/V1/AuthController.php), [security](../../../symfony/config/packages/security.yaml), [login DTO](../../../symfony/src/Dto/AuthLoginRequestDto.php).
- [Catalog controller](../../../catalog-service/src/Controller/Api/CatalogElementsController.php), [catalog query DTO](../../../catalog-service/src/Search/Product/Application/Dto/Read/CatalogListQuery.php), [response DTO](../../../catalog-service/src/Search/Product/Application/Dto/Read/CatalogElementResponse.php).
- [Elasticsearch query builder](../../../catalog-service/src/Search/Product/Infrastructure/Elasticsearch/CatalogSearch/CatalogSearchQueryBuilder.php), [Doctrine reader](../../../catalog-service/src/Search/Product/Infrastructure/Doctrine/DoctrineCatalogReader.php).
- [Cart controller](../../../cart-service/src/Controller/Api/CartController.php), [cart operations](../../../cart-service/src/Cart/CartApiService.php), [order controller](../../../cart-service/src/Controller/Api/OrdersController.php), [order operations](../../../cart-service/src/Order/OrderApiService.php).
- [News visibility](../../../symfony/src/Repository/NewsRepository.php), [news voter](../../../symfony/src/Security/Voter/NewsVoter.php), [notification controller](../../../symfony/src/Controller/Api/V1/NotificationController.php).

### Architecture

Nginx exposes `/api/v1/*`. `symfony` contains Auth, News, users, notifications and EasyAdmin; `catalog-service` owns catalog data; `cart-service` owns both carts and orders. Orders and News are not separate deployed application directories in this repository. Catalog gRPC supplies inventory checks/deductions, checkout prices and product snapshots. PostgreSQL, Redis, Elasticsearch, RabbitMQ and MinIO appear in the infrastructure.

Composer manifests require PHP >=8.5; the main application uses Symfony 8.0 constraints, Catalog and Cart use 8.1 constraints. These are manifest constraints, not a complete installed-version audit.

### Endpoint inventory

There are 28 application operations in the combined Gateway schema. Paths below omit `/api/v1`. Catalog/Stores are rewritten to `/api/*` internally. Cart/Orders are likewise rewritten and authenticated by Gateway; the browser must not supply its own trusted `X-User-Id`.

| Method and path | Input and purpose | Success response | Access |
| --- | --- | --- | --- |
| `GET /ping` | Reachability | `200 {message,version}` | Public |
| `GET /auth/csrf` | `id=authenticate` (default) or `api_mutation` | `200 {token,token_id,header_name,cookie_name}`; companion cookie | Public |
| `POST /auth/login` | JSON `email,password,turnstileToken`; CSRF header | `200 {token}` and auth cookies | Credentials, Turnstile, CSRF |
| `POST /auth/refresh` | Refresh cookie or payload; CSRF header | `200`, access token; optional refresh fields | Valid refresh token |
| `POST /auth/logout` | CSRF header | `204`; clears auth cookies | Auth lifecycle |
| `GET /auth/me` | Current identity | `200 User` | Authenticated |
| `GET /catalog/elements` | Search/filter/page parameters below | `200 {items,pagination}` | Public |
| `GET /catalog/elements/{id}` | Numeric catalog element ID | `200 CatalogElement` including sections | Public |
| `GET /catalog/sections` | Active categories | `200 Category[]` | Public |
| `GET /catalog/sections/{id}` | Numeric category ID | `200 Category` | Public |
| `GET /stores` | Active stores | `200 Store[]` | Public |
| `GET /stores/{id}` | Numeric store ID | `200 Store` | Public |
| `GET /cart` | Current cart | `200 Cart` or empty representation | Authenticated owner |
| `POST /cart/items` | JSON `productId,quantity>=1`; adds to existing quantity | `201` new / `200` updated `CartItem` | Authenticated owner |
| `PATCH /cart/items/{itemId}` | JSON `quantity>=1` and/or integer `sort`; replaces quantity | `200 CartItem` | Owner |
| `DELETE /cart/items/{itemId}` | Remove position | `204` | Owner |
| `DELETE /cart` | Clear cart; idempotent | `204` | Authenticated owner |
| `POST /orders` | Current cart; no checkout form payload | `201 Order` with items | Authenticated owner |
| `GET /orders` | `page=1`, `limit=20` (max 100) | `200 {items,pagination:{page,limit,total,pages}}` | Own orders |
| `GET /orders/{orderId}` | Numeric order ID | `200 OrderDetail` with snapshots | Owner |
| `POST /orders/{orderId}/cancel` | Cancel a pending order | `200 Order` with items | Owner; `pending` only |
| `GET /news` | `query,page,limit,sort,direction` | `200 {items,pagination,sorting}` | Visibility rules |
| `GET /news/{slug}` | Publication slug | `200 News` | Visibility rules |
| `GET /notification` | `page,limit,sort,direction` | `200 {items,pagination,sorting}` | Current recipient |
| `GET /notification/{id}` | Numeric ID | `200 Notification` | Recipient |
| `PATCH /notification/{id}/read` | CSRF `api_mutation` | `200 Notification` | Recipient |
| `DELETE /notification/{id}` | CSRF `api_mutation` | `204` | Recipient |
| `DELETE /notification` | CSRF `api_mutation`; clear own notifications | `204` | Current recipient |

News defaults: page 1, limit 10 (max 100), sort `createdAt`, direction `DESC`; supported sort fields are `id,slug,createdAt`. Notification query documentation exposes the same sorting shape, but its repository allows `id,createdAt,readAt` and normalizes unsupported fields to `createdAt` ([source](../../../symfony/src/Repository/NotificationsRepository.php)). This is a documentation/runtime mismatch to resolve before exposing sorting controls. Pagination metadata on these lists includes `page,limit,total,pages`.

An additional `GET /api/v1/users` exists in the main Symfony controller for fixtures/integration checks. It accepts searchable list parameters and returns IDs/emails in a paginated response, but is not published by Gateway (`404` observed). It is not a profile-management API.

Documentation routes: Gateway `/api-gateway/openapi.json`, `/api/v1/doc`, `/api/v1/doc.json`; Catalog/Cart internal `/api/doc.json`. `/login`, `/logout`, `/admin...` are server-rendered administration routes. Assets, profiler and monitoring routes are not storefront resources.

### Response contracts

| Object | Fields relevant to the storefront |
| --- | --- |
| User | `id,email,roles,firstName,secondName` |
| Catalog element | `id,name,active,description,slug,pictureId,sort,productPrices[],totalStock`; detail adds `sections[]` |
| Price | `id,price,currency,active,validFrom,validTo,priceType`; type contains code/name/activity/sort, with description in detail |
| Category | `id,name,slug,active,description,pictureId,level,sort,parentId` |
| Store | `id,name,slug,active,description` |
| Cart | `id,status,createdAt,updatedAt,items[]` |
| Cart item | `id,catalogElementId,quantity,sort,createdAt,updatedAt`; no product title/media/price |
| Order | `id,status,totalPrice,totalDiscount,finalPrice,createdAt,updatedAt`; creation/cancel include items |
| Order detail item | `id,productSnapshotId,quantity,sort,unitPrice,unitDiscount,finalUnitPrice,lineTotal,createdAt,productSnapshot` |
| Product snapshot | `id,originalProductId,product`; nested product includes historical name/description/slug/pictureId and metadata |
| News | `name,slug,brief,description,createdAt,createdBy,status`; no image field |
| Notification | `id,message,createdAt,readAt` |

Empty cart fields `id,status,createdAt,updatedAt` are null and `items=[]`; this is more permissive than the OpenAPI Cart schema. News identifies records by slug; an exposed news ID is not required. Orders contain snapshots, so historical product display must not be replaced by current catalog data.

Typical failures: invalid catalog query `400`, missing item `404`; unauthenticated protected access `401`; notification ownership/CSRF `403`; add-to-cart missing product `404`, unavailable stock `409`, inventory outage `503`. Cart quantity PATCH documents unavailable quantity as `400`, unlike POST's `409`. Checkout can return `400/404/409/502/503`; cancellation can return `404/409`. Handle `204` without JSON parsing and preserve server error messages where suitable.

### Catalog semantics

| Query parameter | Contract |
| --- | --- |
| `query` | Full-text name (boost 3) and description search |
| `sectionIds[]` | Direct category membership; OR |
| `sectionId` | Deprecated single ID; OR with `sectionIds[]` |
| `active` | Optional boolean-like string; pass `true` for storefront lists |
| `priceFrom,priceTo` | Inclusive non-negative integer bounds; upper bound >= lower bound |
| `priceTypeCodes[]` | OR of type codes, matched with range in the same nested price |
| `inStock` | `true/false/1/0`; summed stock >0 or <=0 |
| `page,limit` | Page >=1, limit 1–100, default 20 |

Order is fixed at `sort DESC,id ASC`, even with search. There is no sort selector API, relevance ordering, autocomplete or facets endpoint. Elasticsearch supports the extended filters; Doctrine reader only consumes legacy `sectionId`, `active` and pagination. Shared configuration selects Elasticsearch, but this must be rechecked per deployment.

Categories are flat and can be assembled by `parentId`. Parent filtering does not automatically include descendants: collect descendant IDs and pass `sectionIds[]` in Elasticsearch mode. Catalog pagination returns either `{page,limit,total}` or `{page,limit,hasNextPage}`; do not invent totals or page counts in the latter mode.

Product detail is fetched by numeric ID, not slug. One `pictureId` is an object key, not a documented public URL. Media resolution, galleries, variant relationships, structured specifications, brands and reviews are absent. Public detail repository methods do not uniformly exclude inactive records.

Catalog price integers are minor units. Checkout uses valid active BASE and SALE prices, caps SALE at BASE, then formats order amounts as decimal strings. WHOLESALE/VIP are not automatically eligible checkout prices. The catalog range filter does not enforce checkout's price validity rules. A shared display/effective-price contract and order currency contract need agreement; never simply choose the smallest price in the response.

### Access and business workflows

JWT works through Bearer or `AUTH_TOKEN` HttpOnly cookie. Login requires Turnstile and CSRF; login throttling is configured. Refresh/logout have CSRF validation. Notification mutations use `api_mutation`. Do not infer that adding a header provides CSRF enforcement for Cart/Orders: those controllers use trusted Gateway identity and have no equivalent explicit CSRF checks in the inspected application code.

Security declares `ROLE_USER` and `ROLE_ADMIN`. Business administration checks also use `User::isAdmin()`, based on groups. Client roles alone do not reproduce all authorization rules. News is public for guests; authenticated users also see internal and authored records; group-based administrators see all. Unavailable detail is concealed as `404`. Notifications belong to the recipient; carts/orders are owner-scoped.

Checkout locks the cart, fetches prices, deducts inventory via gRPC, stores the order/snapshots and removes the cart. Statuses are `pending,completed,canceled`, not payment/delivery states. Only pending orders can be canceled. [Cancellation handling](../../../cart-service/src/Order/OrderCanceledMessageHandler.php) still has a stock-restoration TODO. [Checkout](../../../cart-service/src/Order/OrderApiService.php) also lacks stock compensation after persistence failure. Its internal random inventory operation ID is not a client-supplied checkout idempotency key.

### Existing frontend

Versions from `frontend/package-lock.json`: Next 15.5.15, React 19.2.5, Refine Core 5.0.12, Ant Design 5.29.3, Tailwind 4.2.4, TypeScript 5.9.3. `node_modules` was present; no dependency update or full installed-version audit was performed. React Hook Form, TanStack Table, Turnstile, Vitest and Testing Library are declared; shadcn/ui, Lucide and next-themes are not integrated.

App Router has ru/en routes. `/` redirects to `/ru/news`; news uses list and show routes, with slug passed through a segment named `[id]`. Existing code includes news table/cards/search, login with Turnstile, notification page/popover/polling, bilingual dictionaries, breadcrumbs, administrative layout and light/dark state. Registration/recovery screens are scaffolding: the auth provider and backend do not implement those operations. System theme is absent.

Reuse [API client](../../src/lib/api-client.ts), [auth provider](../../src/providers/auth-provider/auth-provider.client.ts), [data provider](../../src/providers/data-provider/index.ts), news and notification behavior. Caveats: `apiFetch` creates a new client for each call, so CSRF cache and refresh promise do not coalesce independent calls; the data provider stringifies array filters and assumes list totals. The notification badge counts unread entries among the ten loaded records, not all unread notifications. Server auth checks and browser refresh behavior differ; validate their integration before protecting new account pages.

### Safe local observations

Read-only requests were made inside the existing `symfony2026-dev` Gateway pod; no port forwarding or deployment changes were required. They demonstrate in-cluster Gateway behavior, not end-to-end browser reachability.

| Check | Observed result |
| --- | --- |
| Ping, catalog list/detail, sections, stores, news | `200` |
| Search with query, price and stock parameters | `200`; matching records returned |
| Deliberately nonexistent search phrase | `200`, empty list and total 0 |
| Cart/orders/me/notifications without authentication | `401` |
| Users through Gateway | `404` |
| OPTIONS cart/items, origin `http://localhost:3000`, POST with `content-type,x-csrf-token` | `400`; allowed headers omit CSRF, response omits credentials permission |

Cart CORS configuration confirms this cross-origin blocker. [Main CORS](../../../symfony/config/packages/nelmio_cors.yaml), [Catalog CORS](../../../catalog-service/config/packages/nelmio_cors.yaml) and [Cart CORS](../../../cart-service/config/packages/nelmio_cors.yaml) differ. Agree same-origin deployment or a deliberate cross-origin policy before browser integration. No authenticated successful checkout or cancellation was tested.

### Gaps and implementation gates

Before a purchase flow: resolve media URLs/files, browser CORS/cookies/CSRF policy, effective prices/currency, inactive-item visibility, checkout retry/idempotency and stock compensation/restoration. Cart enrichment or batch product lookup would avoid per-item product requests; server cart totals/quote are absent.

Full retail checkout needs address, recipient/contact, delivery selection/cost, payment initiation/status and fulfillment tracking. Self-service needs registration, password recovery, profile update and password change. Catalog improvements need sorting, facets/counts, specifications, variants and gallery. Popularity, personalized recommendations, campaign/banner management, wishlist, reviews and comparison have no supporting API. A global unread count is also absent. These are gaps for possible later scope, not promises that all must be implemented in the first version.

## Русский

### Основания и границы проверки

Дата исследования: 2026-11-13. Помимо Swagger проверены контроллеры, DTO, группы сериализации, репозитории, сервисы, voters, security и Gateway. Игнорируемые `vendor/` и `var/` не читались. Вход, изменяющие POST/PATCH/DELETE, fixtures, миграции, сборки, установки и запуск сервисов не выполнялись. Успешные авторизованные сценарии изучены по коду.

Основные источники: [маршруты Gateway](../../../api-gateway/routes.json), [объединённая OpenAPI](../../../symfony/public/api-gateway/openapi.json), [Auth](../../../symfony/src/Controller/Api/V1/AuthController.php), [security](../../../symfony/config/packages/security.yaml), [DTO каталога](../../../catalog-service/src/Search/Product/Application/Dto/Read/CatalogListQuery.php), [Elasticsearch query builder](../../../catalog-service/src/Search/Product/Infrastructure/Elasticsearch/CatalogSearch/CatalogSearchQueryBuilder.php), [Doctrine reader](../../../catalog-service/src/Search/Product/Infrastructure/Doctrine/DoctrineCatalogReader.php), [корзина](../../../cart-service/src/Cart/CartApiService.php), [заказы](../../../cart-service/src/Order/OrderApiService.php), [видимость новостей](../../../symfony/src/Repository/NewsRepository.php).

### Архитектура

Nginx публикует `/api/v1/*`. В `symfony` находятся Auth, News, пользователи, уведомления и EasyAdmin; `catalog-service` владеет каталогом, `cart-service` — корзиной и заказами. Отдельных приложений Orders/News в исследованной структуре нет. Catalog gRPC обслуживает остатки, цены оформления и снимки товаров. В инфраструктуре присутствуют PostgreSQL, Redis, Elasticsearch, RabbitMQ и MinIO.

Composer требует PHP >=8.5; основной Symfony использует ограничения 8.0, Catalog/Cart — 8.1. Это ограничения manifest-файлов, не полный аудит установленных версий.

### Перечень endpoints

В объединённой схеме 28 операций. Ниже опущен префикс `/api/v1`. Catalog/Stores и Cart/Orders переписываются во внутренние `/api/*`. Для Cart/Orders Gateway проверяет пользователя и устанавливает доверенный `X-User-Id`; браузер не должен подставлять его самостоятельно.

| Метод и путь | Вход и назначение | Успешный ответ | Доступ |
| --- | --- | --- | --- |
| `GET /ping` | Доступность | `200 {message,version}` | Публичный |
| `GET /auth/csrf` | `id=authenticate` по умолчанию или `api_mutation` | Токен, ID, имена header/cookie; companion cookie | Публичный |
| `POST /auth/login` | JSON `email,password,turnstileToken`; CSRF | `200 {token}`, auth cookies | Проверка реквизитов, Turnstile, CSRF |
| `POST /auth/refresh` | Refresh cookie/payload; CSRF | `200`, новый JWT, возможные refresh-поля | Валидный refresh token |
| `POST /auth/logout` | CSRF | `204`, очистка auth cookies | Auth-сценарий |
| `GET /auth/me` | Текущий профиль | `200 User` | Пользователь |
| `GET /catalog/elements` | Поиск, фильтры, пагинация | `200 {items,pagination}` | Публичный |
| `GET /catalog/elements/{id}` | Числовой ID | Товар с разделами | Публичный |
| `GET /catalog/sections` | Активные категории | Массив категорий | Публичный |
| `GET /catalog/sections/{id}` | Числовой ID | Категория | Публичный |
| `GET /stores` | Активные магазины | Массив магазинов | Публичный |
| `GET /stores/{id}` | Числовой ID | Магазин | Публичный |
| `GET /cart` | Текущая корзина | Корзина либо пустое представление | Владелец |
| `POST /cart/items` | JSON `productId,quantity>=1`; прибавляет количество | `201` новая / `200` существующая позиция | Владелец |
| `PATCH /cart/items/{itemId}` | JSON `quantity>=1` и/или `sort`; заменяет количество | Позиция | Владелец |
| `DELETE /cart/items/{itemId}` | Удаление позиции | `204` | Владелец |
| `DELETE /cart` | Очистка, идемпотентно | `204` | Владелец |
| `POST /orders` | Текущая корзина, без payload формы оформления | `201`, заказ с позициями | Владелец |
| `GET /orders` | `page=1,limit=20`, максимум 100 | Заказы и `page/limit/total/pages` | Только свои |
| `GET /orders/{orderId}` | Числовой ID | Заказ с позициями и снимками | Владелец |
| `POST /orders/{orderId}/cancel` | Отмена | Заказ с позициями | Владелец, только `pending` |
| `GET /news` | `query,page,limit,sort,direction` | `items,pagination,sorting` | Правила видимости |
| `GET /news/{slug}` | Slug | Новость | Правила видимости |
| `GET /notification` | `page,limit,sort,direction` | `items,pagination,sorting` | Получатель |
| `GET /notification/{id}` | Числовой ID | Уведомление | Получатель |
| `PATCH /notification/{id}/read` | CSRF `api_mutation` | Уведомление с `readAt` | Получатель |
| `DELETE /notification/{id}` | CSRF `api_mutation` | `204` | Получатель |
| `DELETE /notification` | CSRF `api_mutation` | `204`, удаление своих уведомлений | Получатель |

Новости: page 1, limit 10 (максимум 100), sort `createdAt`, direction `DESC`; поля сортировки `id,slug,createdAt`. Документация уведомлений показывает ту же форму, но репозиторий разрешает `id,createdAt,readAt`, подменяя неподдерживаемое поле на `createdAt` ([источник](../../../symfony/src/Repository/NotificationsRepository.php)). Это расхождение документации и выполнения нужно согласовать до добавления контролов сортировки. Пагинация содержит `page,limit,total,pages`.

В основном Symfony дополнительно есть `GET /api/v1/users`: поиск и пагинация ID/email для fixtures и интеграционных проверок. Gateway его не публикует (`404` подтверждён). Это не API управления профилем.

Документация: `/api-gateway/openapi.json`, `/api/v1/doc`, `/api/v1/doc.json`; внутри Catalog/Cart — `/api/doc.json`. `/login`, `/logout`, `/admin...` — HTML-администрирование. Assets, profiler и monitoring не являются ресурсами витрины.

### Контракты ответов

| Объект | Доступные поля |
| --- | --- |
| Пользователь | `id,email,roles,firstName,secondName` |
| Товар | `id,name,active,description,slug,pictureId,sort,productPrices[],totalStock`; детали добавляют `sections[]` |
| Цена | `id,price,currency,active,validFrom,validTo,priceType`; тип содержит код, название, активность, sort, в деталях — описание |
| Категория | `id,name,slug,active,description,pictureId,level,sort,parentId` |
| Магазин | `id,name,slug,active,description` |
| Корзина | `id,status,createdAt,updatedAt,items[]` |
| Позиция корзины | `id,catalogElementId,quantity,sort,createdAt,updatedAt`; без названия, изображения и цены |
| Заказ | `id,status,totalPrice,totalDiscount,finalPrice,createdAt,updatedAt`; создание/отмена включают позиции |
| Позиция деталей заказа | `id,productSnapshotId,quantity,sort,unitPrice,unitDiscount,finalUnitPrice,lineTotal,createdAt,productSnapshot` |
| Снимок товара | `id,originalProductId,product`; исторические название, описание, slug, pictureId и метаданные |
| Новость | `name,slug,brief,description,createdAt,createdBy,status`; изображения нет |
| Уведомление | `id,message,createdAt,readAt` |

Пустая корзина: `id,status,createdAt,updatedAt=null`, `items=[]`; OpenAPI описывает Cart строже. Новости идентифицируются slug. Исторический состав заказа отображается по снимкам, а не по текущему каталогу.

Ошибки: каталог `400/404`; защищённый доступ без входа `401`; уведомления/CSRF `403`; добавление в корзину `404` товар, `409` остаток, `503` недоступность inventory. PATCH количества документирует недоступное количество как `400`, а POST — `409`. Checkout возвращает также `400/404/409/502/503`, отмена — `404/409`. Ответ `204` не разбирать как JSON.

### Семантика каталога

| Параметр | Поведение |
| --- | --- |
| `query` | Полнотекстовый поиск: название с boost 3 и описание |
| `sectionIds[]` | Прямое членство в разделах, OR |
| `sectionId` | Устаревающий ID, OR с массивом |
| `active` | Необязательная boolean-подобная строка; для витрины передавать `true` |
| `priceFrom,priceTo` | Включительные неотрицательные целые границы |
| `priceTypeCodes[]` | OR типов, диапазон применяется к той же nested-цене |
| `inStock` | `true/false/1/0`, суммарный остаток >0 либо <=0 |
| `page,limit` | Страница >=1, limit 1–100, по умолчанию 20 |

Порядок фиксирован: `sort DESC,id ASC`, даже при поиске. API сортировки, relevance-order, autocomplete и facets отсутствует. Расширенные фильтры поддерживает Elasticsearch; Doctrine использует только старый `sectionId`, `active` и пагинацию. Общая конфигурация выбирает Elasticsearch, но режим нужно проверять для каждого окружения.

Категории плоские, дерево собирается по `parentId`. Родитель не включает потомков автоматически: для Elasticsearch передавать собранные ID через `sectionIds[]`. Пагинация каталога имеет форму `{page,limit,total}` либо `{page,limit,hasNextPage}`; во втором режиме нельзя придумывать число товаров/страниц.

Товар получается по числовому ID, не slug. Единственный `pictureId` — ключ объекта без документированного публичного URL. Нет media resolver, галереи, вариантов, характеристик, брендов и отзывов. Методы деталей не везде исключают неактивные записи.

Целые цены каталога — минимальные денежные единицы. Checkout выбирает действующие активные BASE/SALE, ограничивает SALE базовой ценой и сохраняет суммы заказа десятичными строками. WHOLESALE/VIP автоматически не применяются. Фильтр цены не учитывает все правила действительности checkout. Нужен согласованный контракт отображаемой цены и валюты заказа; нельзя брать минимальную цену из массива.

### Доступ и бизнес-сценарии

JWT принимается через Bearer либо HttpOnly cookie `AUTH_TOKEN`. Вход требует Turnstile/CSRF, настроен throttling. Refresh/logout проверяют CSRF, мутации уведомлений — `api_mutation`. Передача заголовка сама по себе не обеспечивает CSRF-проверку: в исследованных Cart/Orders нет эквивалентной явной проверки, используется доверенная идентификация Gateway.

Заданы `ROLE_USER`/`ROLE_ADMIN`, но бизнес-проверки администратора используют также группы через `User::isAdmin()`. Поле roles не воспроизводит все права. Гость видит public-новости; пользователь — также internal и свои; администратор по группам — все. Недоступная новость скрывается `404`. Уведомления ограничены получателем, корзина/заказы — владельцем.

Checkout блокирует корзину, получает цены, списывает остатки через gRPC, сохраняет заказ/снимки и удаляет корзину. Статусы `pending,completed,canceled` не обозначают оплату/доставку. Отмена разрешена только из pending. [Возврат остатков при отмене](../../../cart-service/src/Order/OrderCanceledMessageHandler.php) и [компенсация после ошибки сохранения](../../../cart-service/src/Order/OrderApiService.php) пока TODO. Внутренний случайный inventory operation ID не является клиентским ключом идемпотентности checkout.

### Существующий frontend

По lock-файлу: Next 15.5.15, React 19.2.5, Refine Core 5.0.12, Ant Design 5.29.3, Tailwind 4.2.4, TypeScript 5.9.3. `node_modules` присутствовал; обновление и полный аудит установленных версий не выполнялись. Объявлены React Hook Form, TanStack Table, Turnstile, Vitest, Testing Library. shadcn/ui, Lucide, next-themes не интегрированы.

App Router поддерживает ru/en; `/` перенаправляет на `/ru/news`. Новости имеют list/show-маршруты, slug передаётся через сегмент `[id]`. Есть таблица/карточки/поиск новостей, login с Turnstile, страница/popover/polling уведомлений, словари, breadcrumbs, admin-layout и Light/Dark. Регистрация/recovery — шаблоны без операций auth provider и backend. System-темы нет.

Переиспользовать [API client](../../src/lib/api-client.ts), [auth provider](../../src/providers/auth-provider/auth-provider.client.ts), [data provider](../../src/providers/data-provider/index.ts), поведение новостей/уведомлений. Ограничения: `apiFetch` создаёт клиент на каждый вызов, поэтому независимые запросы не объединяют cache CSRF/refresh promise; data provider превращает массивы фильтров в строки и предполагает total. Badge уведомлений считает непрочитанные среди десяти загруженных, а не глобально. Серверная auth-проверка отличается от браузерного refresh; интеграцию проверить до защиты новых страниц.

### Безопасные локальные проверки

Запросы выполнены внутри существующего Gateway pod в `symfony2026-dev`, без port-forward и изменения deployment. Подтверждено внутрикластерное поведение Gateway, а не полный браузерный сценарий.

| Проверка | Результат |
| --- | --- |
| Ping, список/детали товара, категории, магазины, новости | `200` |
| Поиск с query, ценой и наличием | `200`, есть совпадения |
| Заведомо отсутствующая фраза | `200`, пустой список, total 0 |
| Корзина/заказы/me/уведомления без входа | `401` |
| Users через Gateway | `404` |
| OPTIONS cart/items, origin `http://localhost:3000`, POST, `content-type,x-csrf-token` | `400`; CSRF отсутствует в разрешённых headers, credentials permission отсутствует |

Различаются [Main CORS](../../../symfony/config/packages/nelmio_cors.yaml), [Catalog CORS](../../../catalog-service/config/packages/nelmio_cors.yaml), [Cart CORS](../../../cart-service/config/packages/nelmio_cors.yaml). Перед браузерной интеграцией согласовать same-origin или явную cross-origin политику. Успешные авторизованные checkout/отмена не проверялись.

### Пробелы и условия реализации

Для покупки: определить media URL/файлы, CORS/cookies/CSRF, эффективную цену/валюту, неактивные товары, повторы checkout/идемпотентность, компенсацию/возврат остатков. Обогащённая корзина либо batch lookup уберут запрос на каждый товар; серверного quote/итога корзины нет.

Полное оформление требует адреса, контактов, доставки/стоимости, оплаты/статуса и отслеживания. Самообслуживание — регистрации, восстановления пароля, редактирования профиля и смены пароля. Каталог — сортировки, facets/counts, характеристик, вариантов и галереи. Нет API популярности, персонализации, управления баннерами/кампаниями, избранного, отзывов, сравнения и общего счётчика непрочитанных. Это возможное развитие, не обязательство включить всё в первую версию.
