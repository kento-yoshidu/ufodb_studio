import { useState } from "react";

type Props = {
  onSubmit: (keyA: string, keyB: string) => void;
}

export default function SameForm({
  onSubmit,
}: Props) {
  const [keyA, setKeyA] = useState("");
  const [keyB, setKeyB] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(keyA, keyB);
      }}
    >
      <input
        value={keyA}
        onChange={(e) => setKeyA(e.target.value)}
        placeholder="Enter a key..."
      />
      <input
        value={keyB}
        onChange={(e) => setKeyB(e.target.value)}
        placeholder="Enter a key..."
      />
      <button type="submit">Same</button>
    </form>
  );
}
