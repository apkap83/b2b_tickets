// Component to render the escalation level
export const EscalationBars_old = ({ level }: { level: number }) => {
  const totalLevels = 4; // Maximum number of levels
  const colors = [
    '#4CAF50', // Level 1: Green (Safe)
    '#FFC107', // Level 2: Yellow (Caution)
    '#FF5722', // Level 3: Orange (Warning)
    '#FF0000', // Level 4: Full Red (Critical)
  ]; // Gradient of colors

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Render the circles */}
      <div style={{ display: 'flex', gap: '5px' }}>
        {Array.from({ length: totalLevels }, (_, index) => (
          <span
            key={index}
            style={{
              display: 'inline-block',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              backgroundColor: index < level ? colors[index] : '#ddd', // Use colors or gray
            }}
          ></span>
        ))}
      </div>
    </div>
  );
};

// Component to render the escalation level
export const EscalationBars = ({
  escalation_levels,
  level,
  showNumbers,
}: {
  escalation_levels: number;
  level: number;
  showNumbers?: boolean;
}) => {
  const totalLevels = escalation_levels || 4; // Maximum number of levels
  const colors = [
    '#4CAF50', // Level 1: Green (Safe)
    '#FFC107', // Level 2: Yellow (Caution)
    '#FF5722', // Level 3: Orange (Warning)
    '#FF0000', // Level 4: Full Red (Critical)
  ]; // Gradient of colors

  const getTextColor = (bgColor: string) => {
    // Function to ensure text contrast
    const color = bgColor.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000' : '#fff'; // Black for bright backgrounds, white for dark
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {/* Render the circles */}
      <div style={{ display: 'flex', gap: '5px' }}>
        {Array.from({ length: totalLevels }, (_, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px', // Smaller size
              height: '16px', // Smaller size
              borderRadius: '50%',
              backgroundColor: index < level ? colors[index] : '#ddd', // Use colors or gray
              color: index < level ? getTextColor(colors[index]) : '#000', // Adjust text contrast
              fontWeight: 'bold',
              fontSize: '8px', // Smaller font size
              border: '1px solid #ccc',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '4.5px',
                top: '-1.75px',
                // transform: 'translate(-50%, -50%)',
              }}
            >
              {showNumbers && level && index + 1}
            </span>
            {/* Display the number */}
          </div>
        ))}
      </div>
    </div>
  );
};
