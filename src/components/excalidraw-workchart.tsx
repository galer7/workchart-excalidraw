import React, { useState, useEffect, useCallback } from "react";
import {
  Excalidraw,
  exportToBlob,
  exportToSvg,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
  AppState,
} from "@excalidraw/excalidraw/types/types";
import { newElementWith } from "@excalidraw/excalidraw";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";

const WorkchartExcalidraw: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string>("");

  useEffect(() => {
    if (excalidrawAPI) {
      const savedDiagram = localStorage.getItem("workchart-diagram");
      if (savedDiagram) {
        const { elements, appState } = JSON.parse(savedDiagram);
        excalidrawAPI.updateScene({ elements, appState });
      }
    }
  }, [excalidrawAPI]);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (excalidrawAPI) {
        const { elements: serializedElements, appState: serializedAppState } =
          serializeAsJSON(
            elements,
            appState,
            excalidrawAPI.getFiles(),
            "local"
          );
        localStorage.setItem(
          "workchart-diagram",
          JSON.stringify({
            elements: serializedElements,
            appState: serializedAppState,
          })
        );
        generateMermaidCode(elements);
      }
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

  const addNode = (type: "rectangle" | "diamond" | "ellipse") => {
    if (excalidrawAPI) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const newElement = newElementWith({
        type,
        x: centerX,
        y: centerY,
        width: 100,
        height: 100,
        backgroundColor: "transparent",
        strokeColor: "#000000",
        fillStyle: "hachure",
        strokeWidth: 1,
        roughness: 1,
        opacity: 100,
        id: nanoid(),
        strokeStyle: "solid",
        text:
          type === "rectangle"
            ? "Action"
            : type === "diamond"
            ? "Condition"
            : "State",
      });

      excalidrawAPI.updateScene({
        elements: [...excalidrawAPI.getSceneElements(), newElement],
      });
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
          onChange={onChange}
          onPointerUpdate={() => {}}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
        />
      </div>
    </div>
  );
};

export default WorkchartExcalidraw;
