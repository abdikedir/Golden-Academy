const safeValue = (value) => {
  if (value === null || value === undefined) return "-";
  return String(value);
};

export const exportRowsToPdf = async ({
  fileName = "export.pdf",
  title = "Export",
  subtitle = "",
  columns = [],
  rows = [],
  orientation = "landscape",
}) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text(title, 40, 40);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(subtitle, 40, 58);
  }

  const head = [columns.map((column) => column.header)];
  const body = rows.map((row) =>
    columns.map((column) => safeValue(column.accessor(row))),
  );

  autoTable(doc, {
    startY: subtitle ? 74 : 56,
    head,
    body,
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [31, 143, 83],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 251, 247],
    },
    margin: { left: 24, right: 24 },
    theme: "striped",
  });

  doc.save(fileName);
};
