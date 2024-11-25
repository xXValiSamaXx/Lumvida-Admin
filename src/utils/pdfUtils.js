export const determineImageOrientation = (imageData) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const orientation = {
          width: img.width,
          height: img.height,
          isLandscape: img.width > img.height,
          ratio: img.width / img.height
        };
        resolve(orientation);
      };
      img.src = imageData;
    });
  };
  
  export const addImageToPDF = async (doc, imageData, y) => {
    try {
      const orientation = await determineImageOrientation(imageData);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      let imageWidth, imageHeight, xPos;
      
      if (orientation.isLandscape) {
        imageWidth = Math.min(180, pageWidth - 40);
        imageHeight = imageWidth / orientation.ratio;
        xPos = (pageWidth - imageWidth) / 2;
        
        doc.addImage(
          imageData,
          'JPEG',
          xPos,
          y,
          imageWidth,
          imageHeight,
          null,
          'FAST',
          0
        );
      } else {
        imageHeight = Math.min(180, pageHeight - y - 20);
        imageWidth = imageHeight * orientation.ratio;
        xPos = (pageWidth - imageWidth) / 2;
        
        doc.addImage(
          imageData,
          'JPEG',
          xPos,
          y,
          imageWidth,
          imageHeight,
          null,
          'FAST',
          0
        );
      }
      
      return y + imageHeight + 10;
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      doc.text('Error al cargar la imagen', 20, y);
      return y + 10;
    }
  };