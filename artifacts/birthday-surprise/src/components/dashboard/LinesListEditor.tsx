import { Textarea } from "@/components/ui/textarea";
import { IconTextButton } from "@/components/dashboard/FormFields";

// CRUD editor for the "Last Note" letter — a plain list of lines that
// type themselves onto the page one after another.
export default function LinesListEditor({
  lines,
  onChange,
}: {
  lines: string[];
  onChange: (lines: string[]) => void;
}) {
  const updateLine = (index: number, value: string) => {
    onChange(lines.map((l, i) => (i === index ? value : l)));
  };
  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };
  const addLine = () => {
    onChange([...lines, ""]);
  };

  return (
    <div>
      {lines.map((line, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", paddingTop: "8px", minWidth: "18px" }}>
            {i + 1}.
          </span>
          <Textarea
            value={line}
            onChange={(e) => updateLine(i, e.target.value)}
            rows={2}
            style={{ resize: "vertical", flex: 1 }}
          />
          <IconTextButton tone="danger" onClick={() => removeLine(i)}>
            ✕
          </IconTextButton>
        </div>
      ))}
      <IconTextButton onClick={addLine}>+ Add line</IconTextButton>
    </div>
  );
}
