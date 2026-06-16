import type { Electrode } from "../data/electrodes";

type VoltageSlidersProps = {
  electrodes: Electrode[];
  voltages: number[];
  onVoltageChange: (index: number, value: number) => void;
};

export function VoltageSliders({
  electrodes,
  voltages,
  onVoltageChange,
}: VoltageSlidersProps) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2>Electrode voltages</h2>

      {voltages.map((voltage, index) => (
        <div key={electrodes[index].name} style={{ marginBottom: "1rem" }}>
          <label>
            {electrodes[index].name}: {voltage.toFixed(1)} V
          </label>

          <input
            type="range"
            min="-130"
            max="130"
            step="1"
            value={voltage}
            onChange={(event) =>
              onVoltageChange(index, Number(event.target.value))
            }
            style={{ width: "100%" }}
          />
        </div>
      ))}
    </section>
  );
}