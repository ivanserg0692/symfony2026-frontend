"use client";

import { useTranslate } from "@refinedev/core";
import { Button, Checkbox, Form, Input, Select } from "antd";
import type { CatalogSection } from "@/types/catalog";
import { priceToMinorUnits, sectionAncestors, type CatalogQuery } from "./query";

type FilterValues = Pick<CatalogQuery, "section" | "priceFrom" | "priceTo" | "inStock">;

export const CatalogFilterForm = ({ value, sections, onApply, onReset, name }: {
  value: CatalogQuery;
  sections: CatalogSection[];
  onApply: (value: FilterValues) => void;
  onReset: () => void;
  name: string;
}) => {
  const translate = useTranslate();
  const [form] = Form.useForm<FilterValues>();
  const priceRules = [{ validator: (_: unknown, input: string | undefined) =>
    !input || priceToMinorUnits(input) !== null ? Promise.resolve() : Promise.reject(new Error(translate("shop.invalidPrice"))),
  }];
  return (
    <Form name={name} form={form} layout="vertical" initialValues={value} onFinish={onApply}>
      <Form.Item name="section" label={translate("storefront.sections")}>
        <Select allowClear showSearch optionFilterProp="label" placeholder={translate("shop.allSections")} options={sections.map((section) => ({
          value: section.id,
          label: sectionAncestors(sections, section.id).map((item) => item.name || translate("storefront.unnamedSection")).join(" / "),
        }))} />
      </Form.Item>
      <Form.Item name="priceFrom" label={translate("shop.priceFrom")} rules={priceRules}>
        <Input inputMode="decimal" />
      </Form.Item>
      <Form.Item name="priceTo" label={translate("shop.priceTo")} dependencies={["priceFrom"]} rules={[...priceRules, {
        validator: (_, input: string | undefined) => {
          const from = priceToMinorUnits(form.getFieldValue("priceFrom") || "");
          const to = priceToMinorUnits(input || "");
          return from === null || to === null || from <= to ? Promise.resolve() : Promise.reject(new Error(translate("shop.invalidRange")));
        },
      }]}>
        <Input inputMode="decimal" />
      </Form.Item>
      <p className="storefront-filter-note">{translate("shop.priceFilterNote")}</p>
      <Form.Item name="inStock" valuePropName="checked"><Checkbox>{translate("shop.onlyInStock")}</Checkbox></Form.Item>
      <div className="storefront-filter-actions">
        <Button type="primary" htmlType="submit">{translate("shop.apply")}</Button>
        <Button onClick={onReset}>{translate("shop.reset")}</Button>
      </div>
    </Form>
  );
};
