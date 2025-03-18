import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, XIcon } from 'lucide-react';

interface BackgroundSelectorProps {
  onBackgroundChange?: (type: string, value?: string) => void;
}

export default function BackgroundSelector({ onBackgroundChange }: BackgroundSelectorProps) {
  const [selectedType, setSelectedType] = useState<string>('none');
  const [customBackground, setCustomBackground] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomBackground(url);
      onBackgroundChange?.(url ? 'custom' : 'none', url);
    }
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    if (value === 'none') {
      onBackgroundChange?.(value);
    } else if (value === 'blur') {
      onBackgroundChange?.(value);
    }
  };

  const handleChange = (type: string, value?: string) => {
    onBackgroundChange?.(type, value);
  };

  return (
    <div className="flex items-center space-x-4">
      <Select value={selectedType} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select background" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No background</SelectItem>
          <SelectItem value="blur">Blur background</SelectItem>
          <SelectItem value="custom">Custom background</SelectItem>
        </SelectContent>
      </Select>

      {selectedType === 'custom' && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('bg-upload')?.click()}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          {customBackground && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomBackground(null);
                onBackgroundChange?.(null ? 'none' : 'none');
              }}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
          <input
            id="bg-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}
    </div>
  );
} 