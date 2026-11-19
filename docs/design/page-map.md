# Storefront Page Map

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [English](#english)
  - [Routing and support levels](#routing-and-support-levels)
  - [Page contracts](#page-contracts)
  - [Main shopping flow](#main-shopping-flow)
  - [Shared states and components](#shared-states-and-components)
  - [First-version boundary](#first-version-boundary)
- [Русский](#%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9)
  - [Маршруты и уровни поддержки](#%D0%BC%D0%B0%D1%80%D1%88%D1%80%D1%83%D1%82%D1%8B-%D0%B8-%D1%83%D1%80%D0%BE%D0%B2%D0%BD%D0%B8-%D0%BF%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%BA%D0%B8)
  - [Контракты страниц](#%D0%BA%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%BA%D1%82%D1%8B-%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86)
  - [Основной путь покупки](#%D0%BE%D1%81%D0%BD%D0%BE%D0%B2%D0%BD%D0%BE%D0%B9-%D0%BF%D1%83%D1%82%D1%8C-%D0%BF%D0%BE%D0%BA%D1%83%D0%BF%D0%BA%D0%B8)
  - [Общие состояния и компоненты](#%D0%BE%D0%B1%D1%89%D0%B8%D0%B5-%D1%81%D0%BE%D1%81%D1%82%D0%BE%D1%8F%D0%BD%D0%B8%D1%8F-%D0%B8-%D0%BA%D0%BE%D0%BC%D0%BF%D0%BE%D0%BD%D0%B5%D0%BD%D1%82%D1%8B)
  - [Граница первой версии](#%D0%B3%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0-%D0%BF%D0%B5%D1%80%D0%B2%D0%BE%D0%B9-%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D0%B8)

<!-- END doctoc -->

## English

### Routing and support levels

Stage 1 update (2026-11-20): only the localized home and storefront shell are implemented. Catalog navigation is an anchor to home product previews; search/cart are disabled. Category/product previews are read-only. Other storefront routes below remain planned. Existing news and notification routes are preserved, including `/news/show/{slug}` and `/notifications` under each locale. No account, catalog, product, cart or checkout pages were added in stage 1.

Proposed paths below are relative to the existing `/{locale}` prefix (`ru`/`en`). These are planning routes, not implemented pages. Preserve existing news/auth entry points with an explicit migration/redirect plan when the implementation task is approved; current localized news detail uses `/news/show/{slug}`.

**Supported** means the essential data/operation exists in source; it does not mean an authenticated browser acceptance test passed. **Partial** means a useful reduced page is possible with documented omissions or integration work. **Backend required** means the core scenario has no API. The shared cross-origin authentication blocker applies to protected pages.

### Page contracts

API paths in this table omit `/api/v1`.

| Proposed route | Purpose and main components | Endpoints | Support and limitations |
| --- | --- | --- | --- |
| `/` | Search header, static hero/CTA, category navigation, catalog rows, news previews | GET sections/elements/news | Partial: ordinary catalog selections; no popularity, personalization or banner-management API |
| `/catalog` | Search input, category/price/stock filters, active filter chips, product grid, pagination | GET catalog/elements and catalog/sections | Partial: Elasticsearch filters; no user sorting; media unresolved |
| `/category/{id}` | Category heading/description, breadcrumbs, children, filtered grid | GET catalog/sections/{id}, sections, elements with sectionIds[] | Partial: assemble tree and descendant IDs; numeric ID lookup |
| `/product/{id}` | Single image/fallback, title, price, availability, quantity, add button, description/categories | GET catalog/elements/{id}; POST cart/items | Partial: no gallery, variants, specs/reviews; login required to add |
| `/cart` | Product rows, quantity stepper, remove/clear, estimated totals, confirmation CTA | GET/PATCH/DELETE cart; POST cart/items; GET elements/{id} per product | Partial: cart has IDs/quantities only; no batch enrichment or authoritative quote |
| `/checkout` | Review cart, price-change/error notice, confirmation button, created-order result | GET cart + catalog details; POST orders; GET orders/{id} | Partial: creates an order; no address/delivery/payment payload |
| `/login` | Email/password, Turnstile, validation/error/pending states | GET auth/csrf, POST auth/login, GET auth/me | Supported contract; browser cookies/CORS and Turnstile configuration must work |
| `/account` | Read-only identity, order/notification links, logout | GET auth/me, POST auth/logout | Partial: no profile editing/password-change API |
| `/account/orders` | Order list, status, dates, totals, pagination | GET orders | Supported; only current owner's orders |
| `/account/orders/{id}` | Historical item details, totals, status, cancel confirmation | GET orders/{id}, POST orders/{id}/cancel | Partial: detail exists; cancellation stock restoration is unfinished |
| `/news` | Searchable text cards/list, dates, pagination | GET news | Supported; no cover image field |
| `/news/{slug}` | Publication title/body/brief/date/author, back link | GET news/{slug} | Supported; preserve visibility and 404 behavior |
| `/account/notifications` | Notification list, read/delete/clear actions, pagination | Notification GET/PATCH/DELETE | Supported; total unread counter absent |
| `/stores` | Optional store directory/detail panel | GET stores, stores/{id} | Supported for names/descriptions only; no structured address/hours/map/stock selection |
| `/register` | Account creation | None | Backend required; existing frontend screen is scaffolding |
| `/forgot-password` | Password recovery | None | Backend required; existing frontend screen is scaffolding |

### Main shopping flow

Guest browses home/catalog/category/product. Add-to-cart requires login. After successful login, the future implementation should preserve the intended destination/action through an explicitly approved return flow; the existing login currently redirects to news. Do not silently change authentication behavior in a documentation task.

An authenticated buyer edits the server cart, reviews an estimated total and confirms creation. The server determines final prices and inventory; the success screen uses the created order and then its snapshot-backed detail. A failed checkout must not display success or assume the cart was cleared. Avoid automatic retries of non-idempotent purchase operations without an agreed backend contract.

Checkout's CTA should say “Create order”, not “Pay”. No payment receipt, delivery date, address selector or shipment timeline may be fabricated. Cancellation is available in the API only for pending orders; enabling the buyer-facing action is gated on agreeing the incomplete stock-restoration behavior.

### Shared states and components

Share header/search, category navigation, footer, theme selector and product-card presentation. Keep layout independent from data loading. Product cards display the same effective price rule as detail/cart. Do not use an arbitrary minimum of BASE/SALE/WHOLESALE/VIP.

Design loading skeletons, empty catalog/search/cart/order list, missing/unavailable item, login-required, invalid filters, stock conflict, price unavailable and service outage. Disabled or pending purchase controls must prevent accidental repeated clicks while reporting the server result honestly. When totals are absent, pagination uses previous/next instead of a made-up total.

### First-version boundary

Candidate first scope: public discovery, reduced product detail, existing login, authenticated cart, simplified order confirmation/history, news and notifications. Resolve [API gates](api-analysis.md) before scheduling purchase integration. Defer registration/recovery, full checkout, reviews, wishlist, comparison, personalized recommendations and gallery/specifications until their contracts exist. `/stores` is optional and does not imply pickup selection.

## Русский

### Маршруты и уровни поддержки

Обновление этапа 1 (2026-11-20): реализованы только локализованная главная и оболочка витрины. «Каталог» ведёт к превью товаров главной, поиск/корзина отключены. Разделы и товары доступны только для просмотра превью. Остальные маршруты витрины ниже остаются планом. Существующие маршруты новостей и уведомлений сохранены, включая `/news/show/{slug}` и `/notifications` внутри локали. Страницы аккаунта, каталога, товара, корзины и checkout на этапе 1 не добавлялись.

Пути ниже предлагаются внутри существующего `/{locale}` (`ru`/`en`). Это план, страницы не реализованы. При реализации нужен явный план перехода/редиректов существующих news/auth-маршрутов; сейчас локализованные детали новости используют `/news/show/{slug}`.

**Поддерживается** — необходимый контракт существует по коду, но успешный авторизованный браузерный тест не выполнялся. **Частично** — доступна сокращённая страница с ограничениями либо необходима интеграционная работа. **Нужен backend** — основной сценарий не имеет API. Общий CORS-блокер относится к защищённым страницам.

### Контракты страниц

У API опущен префикс `/api/v1`.

| Предлагаемый маршрут | Назначение и компоненты | Endpoints | Поддержка и ограничения |
| --- | --- | --- | --- |
| `/` | Шапка/поиск, статический баннер/CTA, категории, товарные ряды, новости | GET sections/elements/news | Частично: обычные выборки; нет популярности, персонализации, управления баннерами |
| `/catalog` | Поиск, категории/цена/наличие, chips фильтров, сетка, пагинация | GET catalog/elements, catalog/sections | Частично: фильтры Elasticsearch; нет выбора сортировки, media URL |
| `/category/{id}` | Заголовок/описание, breadcrumbs, подкатегории, товары | GET catalog/sections/{id}, sections, elements с sectionIds[] | Частично: дерево/ID потомков собрать; числовой ID |
| `/product/{id}` | Одно изображение/fallback, название, цена, наличие, количество, покупка, описание/категории | GET catalog/elements/{id}; POST cart/items | Частично: нет галереи, вариантов, характеристик/отзывов; для покупки вход |
| `/cart` | Позиции, количество, удаление/очистка, предварительные суммы, CTA | Cart GET/PATCH/DELETE, POST cart/items; GET elements/{id} для каждой позиции | Частично: корзина содержит ID/количество, нет batch enrichment и серверного quote |
| `/checkout` | Проверка состава, ошибки/изменение цены, подтверждение, результат | GET cart + детали товаров; POST orders; GET orders/{id} | Частично: заказ создаётся, но адреса/доставки/оплаты нет |
| `/login` | Email/password, Turnstile, валидация, ошибки/pending | GET auth/csrf, POST auth/login, GET auth/me | Контракт поддерживается; нужны рабочие cookies/CORS/Turnstile |
| `/account` | Просмотр профиля, ссылки на заказы/уведомления, выход | GET auth/me, POST auth/logout | Частично: нет изменения профиля/пароля |
| `/account/orders` | Список, статусы, даты, суммы, пагинация | GET orders | Поддерживается, только свои заказы |
| `/account/orders/{id}` | Исторический состав, суммы, статус, подтверждение отмены | GET orders/{id}, POST orders/{id}/cancel | Частично: просмотр есть, возврат остатков при отмене не завершён |
| `/news` | Поиск, текстовые карточки/список, даты, пагинация | GET news | Поддерживается, обложки нет |
| `/news/{slug}` | Заголовок, текст/анонс, дата/автор, возврат | GET news/{slug} | Поддерживается; сохранять видимость/404 |
| `/account/notifications` | Список, прочтение/удаление/очистка, пагинация | Notification GET/PATCH/DELETE | Поддерживается; нет общего unread count |
| `/stores` | Необязательный справочник/панель деталей | GET stores, stores/{id} | Названия/описания поддерживаются; нет адресов/часов/карты/выбора остатков |
| `/register` | Регистрация | Нет | Нужен backend; текущая страница шаблонная |
| `/forgot-password` | Восстановление пароля | Нет | Нужен backend; текущая страница шаблонная |

### Основной путь покупки

Гость просматривает главную/каталог/категорию/товар. Добавление требует входа. Возврат к исходному действию после login нужно явно согласовать при реализации: сейчас вход перенаправляет на новости. Документирование не меняет авторизацию.

Пользователь редактирует серверную корзину, видит предварительный итог и подтверждает создание. Финальные цены/остатки определяет сервер. Успех отображается по созданному заказу и затем деталям со снимками. Ошибка checkout не означает успех или очистку корзины. Автоповторы неидемпотентной покупки требуют согласованного backend-контракта.

CTA — «Создать заказ», не «Оплатить». Не показывать выдуманные чек, дату доставки, адресную форму или timeline отправки. API разрешает отмену pending-заказа, но включение пользовательской кнопки требует решения по незавершённому возврату остатков.

### Общие состояния и компоненты

Общие элементы: шапка/поиск, категории, footer, темы, представление карточки товара. Отделять layout от загрузки данных. Правило цены едино для карточки/товара/корзины; не брать произвольный минимум BASE/SALE/WHOLESALE/VIP.

Предусмотреть skeleton, пустую выдачу/поиск/корзину/историю, отсутствие товара, требование входа, неверный фильтр, конфликт остатков, отсутствие цены и недоступность сервиса. Pending-контролы предотвращают повторные нажатия и честно показывают результат сервера. Без total использовать «Назад/Далее».

### Граница первой версии

Кандидат на первый объём: публичный каталог, сокращённая карточка товара, существующий login, авторизованная корзина, подтверждение/история заказов, новости и уведомления. Перед покупкой закрыть [условия API](api-analysis.md). Регистрацию/recovery, полное оформление, отзывы, избранное, сравнение, персонализацию, галерею/характеристики отложить до API. Справочник `/stores` необязателен и не означает выбор самовывоза.
