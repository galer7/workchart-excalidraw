import React, { useState, useEffect, useCallback } from "react";
import {
  Excalidraw,
  exportToBlob,
  exportToSvg,
  serializeAsJSON,
  convertToExcalidrawElements,
  restoreElements,
} from "@excalidraw/excalidraw";
import {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
  ExcalidrawTextElement,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types/types";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "workchart-diagram";

const WorkchartExcalidraw: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
    files: BinaryFiles;
  } | null>(null);

  useEffect(() => {
    const savedDiagram = localStorage.getItem(STORAGE_KEY);
    if (savedDiagram) {
      try {
        const { elements, appState, files } = JSON.parse(savedDiagram);
        setInitialData({ elements, appState, files });
      } catch (error) {
        console.error("Failed to load saved diagram:", error);
      }
    }
  }, []);

  const onChange = useCallback(
    (
      excalidrawElements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      const serializedData = serializeAsJSON(
        excalidrawElements,
        appState,
        files,
        "local"
      );
      localStorage.setItem(STORAGE_KEY, serializedData);
      generateMermaidCode(excalidrawElements);
    },
    [excalidrawAPI]
  );

  const generateMermaidCode = (elements: readonly ExcalidrawElement[]) => {
    let code = "graph TD\n";
    elements.forEach((element) => {
      const nodeId = element.id;
      const label = element.text || element.id;
      switch (element.type) {
        case "rectangle":
          code += `  ${nodeId}[${label}]\n`;
          break;
        case "diamond":
          code += `  ${nodeId}{${label}}\n`;
          break;
        case "ellipse":
          code += `  ${nodeId}((${label}))\n`;
          break;
      }
    });
    elements.forEach((element) => {
      if (element.type === "arrow") {
        const sourceId = element.startBinding?.elementId;
        const targetId = element.endBinding?.elementId;
        if (sourceId && targetId) {
          code += `  ${sourceId} --> ${targetId}\n`;
        }
      }
    });
    setMermaidCode(code);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const exportToPNG = async () => {
    if (excalidrawAPI) {
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "workchart.png";
      link.click();
    }
  };

  const exportToSVG = async () => {
    if (excalidrawAPI) {
      const svg = await exportToSvg({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
      });
      const svgBlob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
      const url = window.URL.createObjectURL(svgBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "workchart.svg";
      link.click();
    }
  };

  const typeToMeaning = {
    rectangle: "Action",
    diamond: "Condition",
    ellipse: "State",
  };

  const addNode = (type: "rectangle" | "diamond" | "ellipse") => {
    if (excalidrawAPI) {
      const { width, height, offsetLeft, offsetTop } =
        excalidrawAPI.getAppState();
      const centerX = width / 2 + offsetLeft;
      const centerY = height / 2 + offsetTop;

      console.log("centerX", centerX);

      const sameShapeElementCount = excalidrawAPI
        .getSceneElements()
        .filter((element) => element.type === type).length;

      const shapeElements = convertToExcalidrawElements([
        {
          type,
          x: centerX - 50,
          y: centerY - 50,
          width: 300,
          height: 100,
          label: {
            text: `${typeToMeaning[type]}_${sameShapeElementCount + 1}`,
          },
        },
      ]);

      excalidrawAPI.updateScene({
        elements: [...excalidrawAPI.getSceneElements(), ...shapeElements],
      });

      // Center the view on the new elements
      excalidrawAPI.scrollToContent([...shapeElements]);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f0f0f0",
        }}
      >
        <h1 style={{ margin: 0 }}>Workchart: Workflow + Flowchart</h1>
        <div>
          <Button
            onClick={() => addNode("rectangle")}
            style={{ marginRight: "5px" }}
          >
            Add Action
          </Button>
          <Button
            onClick={() => addNode("diamond")}
            style={{ marginRight: "5px" }}
          >
            Add Condition
          </Button>
          <Button
            onClick={() => addNode("ellipse")}
            style={{ marginRight: "5px" }}
          >
            Add State
          </Button>
          <Button onClick={exportToPNG} style={{ marginRight: "5px" }}>
            Export to PNG
          </Button>
          <Button onClick={exportToSVG} style={{ marginRight: "5px" }}>
            Export to SVG
          </Button>
          <Button onClick={copyToClipboard}>Copy Mermaid Code</Button>
        </div>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <Excalidraw
          initialData={initialData || undefined}
          onChange={onChange}
          onPointerUpdate={() => {}}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
        />
      </div>
    </div>
  );
};

export default WorkchartExcalidraw;
