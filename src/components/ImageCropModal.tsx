
import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crop } from "lucide-react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImage: string) => void;
  imageSrc: string;
  aspectRatio?: number;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  onCrop,
  imageSrc,
  aspectRatio = 1,
}) => {
  const cropperRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleCrop = () => {
    if (!cropperRef.current) return;

    setIsProcessing(true);
    
    try {
      const croppedCanvas = cropperRef.current.getCroppedCanvas({
        width: aspectRatio === 1 ? 200 : undefined,
        height: aspectRatio === 1 ? 200 : undefined,
      });
      
      const croppedImageUrl = croppedCanvas.toDataURL("image/png");
      onCrop(croppedImageUrl);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium flex items-center justify-center gap-2">
              <Crop className="h-5 w-5" />
              Crop Image
            </h3>
            <p className="text-sm text-gray-500">
              Adjust the image to your liking before saving
            </p>
          </div>
          
          <div className="w-full border border-gray-200 rounded-md overflow-hidden" style={{ height: "300px" }}>
            <Cropper
              ref={cropperRef}
              src={imageSrc}
              style={{ height: "100%", width: "100%" }}
              aspectRatio={aspectRatio}
              guides={true}
              viewMode={1}
              dragMode="move"
              scalable={true}
              cropBoxMovable={true}
              cropBoxResizable={true}
              minCropBoxHeight={10}
              minCropBoxWidth={10}
              background={false}
              responsive={true}
              autoCropArea={1}
              checkOrientation={false}
            />
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={onClose}
              className="mt-2 sm:mt-0"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCrop}
              disabled={isProcessing}
              className="bg-xspectrum-purple hover:bg-xspectrum-purple/90"
            >
              {isProcessing ? "Processing..." : "Crop & Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropModal;
