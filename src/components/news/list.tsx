"use client";

import React from "react";
import { useNavigation, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

type NewsRecord = {
  name: string;
  slug: string;
  createdAt: string;
  createdBy?: {
    firstName?: string;
  };
  description?: string;
  brief?: string;
  status?: {
    name?: string;
  };
};

export const NewsList = () => {
  const translate = useTranslate();
  const { show } = useNavigation();

  const columns = React.useMemo<ColumnDef<NewsRecord>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: translate("news.fields.name"),
      },
      {
        id: "slug",
        accessorKey: "slug",
        header: translate("news.fields.slug"),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: translate("news.fields.createdAt"),
        cell: function render({ getValue }) {
          return new Date(getValue<string>()).toLocaleString(undefined, {
            timeZone: "UTC",
          });
        },
      },
      {
        id: "createdBy",
        accessorKey: "createdBy.firstName",
        header: translate("news.fields.createdBy"),
      },
      {
        id: "description",
        accessorKey: "description",
        header: translate("news.fields.description"),
      },
      {
        id: "brief",
        accessorKey: "brief",
        header: translate("news.fields.brief"),
      },
      {
        id: "status",
        accessorKey: "status.name",
        header: translate("news.fields.status"),
      },
      {
        id: "actions",
        accessorKey: "slug",
        header: translate("table.actions"),
        cell: function render({ getValue }) {
          return (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: "4px",
              }}
            >
              <button
                onClick={() => {
                  show("news", getValue<string>());
                }}
              >
                {translate("buttons.show")}
              </button>
            </div>
          );
        },
      },
    ],
    [show, translate],
  );

  const {
    reactTable: {
      getHeaderGroups,
      getRowModel,
      getState,
      setPageIndex,
      getCanPreviousPage,
      getPageCount,
      getCanNextPage,
      nextPage,
      previousPage,
      setPageSize,
    },
  } = useTable({
    columns,
  });

  return (
    <section className="news-list">
      <header className="news-list__header">
        <div>
          <h1>{translate("news.titles.list")}</h1>
        </div>
      </header>
      <div className="news-list__table-wrap">
        <table className="news-list__table">
          <thead>
            {getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {!header.isPlaceholder &&
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: "12px" }}>
        <button
          onClick={() => setPageIndex(0)}
          disabled={!getCanPreviousPage()}
        >
          {"<<"}
        </button>
        <button
          onClick={() => previousPage()}
          disabled={!getCanPreviousPage()}
        >
          {"<"}
        </button>
        <button onClick={() => nextPage()} disabled={!getCanNextPage()}>
          {">"}
        </button>
        <button
          onClick={() => setPageIndex(getPageCount() - 1)}
          disabled={!getCanNextPage()}
        >
          {">>"}
        </button>
        <span>
          <strong>
            {" "}
            {getState().pagination.pageIndex + 1} / {getPageCount()}{" "}
          </strong>
        </span>
        <span>
          | {translate("pagination.go")}:{" "}
          <input
            type="number"
            defaultValue={getState().pagination.pageIndex + 1}
            onChange={(event) => {
              const page = event.target.value
                ? Number(event.target.value) - 1
                : 0;
              setPageIndex(page);
            }}
          />
        </span>{" "}
        <select
          value={getState().pagination.pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {translate("pagination.show")} {pageSize}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
};
