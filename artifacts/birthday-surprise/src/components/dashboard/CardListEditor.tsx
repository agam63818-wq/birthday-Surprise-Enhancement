import { TextField, IconTextButton, SectionDivider } from "@/components/dashboard/FormFields";

export interface EditableCard {
  icon: string;
  title: string;
  desc: string;
}

// CRUD editor for the repeatable {icon,title,desc} cards used by
// "Why You Matter" and "Our Story".
export default function CardListEditor({
  cards,
  onChange,
}: {
  cards: EditableCard[];
  onChange: (cards: EditableCard[]) => void;
}) {
  const updateCard = (index: number, patch: Partial<EditableCard>) => {
    onChange(cards.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };
  const removeCard = (index: number) => {
    onChange(cards.filter((_, i) => i !== index));
  };
  const addCard = () => {
    onChange([...cards, { icon: "✨", title: "", desc: "" }]);
  };

  return (
    <div>
      {cards.map((card, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", letterSpacing: "0.05em" }}>
              Card {i + 1}
            </span>
            <IconTextButton tone="danger" onClick={() => removeCard(i)}>
              Remove
            </IconTextButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "10px" }}>
            <TextField label="Icon" value={card.icon} onChange={(v) => updateCard(i, { icon: v })} />
            <TextField label="Title" value={card.title} onChange={(v) => updateCard(i, { title: v })} />
          </div>
          <TextField label="Description" value={card.desc} onChange={(v) => updateCard(i, { desc: v })} />
          {i < cards.length - 1 && <SectionDivider />}
        </div>
      ))}
      <IconTextButton onClick={addCard}>+ Add card</IconTextButton>
    </div>
  );
}
