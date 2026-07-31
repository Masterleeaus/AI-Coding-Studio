import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

describe("SheetJS workbook compatibility", () => {
  it("creates, serializes and reopens an XLSX workbook", () => {
    const expectedRows = [
      { Product: "Widget", Price: 9.99, Stock: 42 },
      { Product: "Gadget", Price: 24.99, Stock: 17 },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(expectedRows);
    worksheet["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const encodedWorkbook = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });

    expect(encodedWorkbook.length).toBeGreaterThan(100);

    const reopenedWorkbook = XLSX.read(encodedWorkbook, { type: "base64" });
    expect(reopenedWorkbook.SheetNames).toEqual(["Products"]);

    const reopenedRows = XLSX.utils.sheet_to_json(
      reopenedWorkbook.Sheets.Products,
    );
    expect(reopenedRows).toEqual(expectedRows);
  });
});
