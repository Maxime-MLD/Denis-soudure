import { useEffect } from "react";
import { set, useFormValue, type StringInputProps } from "sanity";

export default function AutoAltInput(props: StringInputProps) {
  const { value, onChange, renderDefault } = props;

  const title = useFormValue(["title"]) as string | undefined;

  useEffect(() => {
    // Remplit automatiquement uniquement si le ALT est vide
    if (!value && title?.trim()) {
      onChange(set(title.trim()));
    }
  }, [title, value, onChange]);

  return renderDefault(props);
}
