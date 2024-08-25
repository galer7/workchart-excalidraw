import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Excalidraw,
  exportToBlob,
  exportToSvg,
  serializeAsJSON,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
} from "@excalidraw/excalidraw/types/types";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import ExampleSidebar from "./sidebar/ExampleSidebar";

const WorkchartExcalidraw: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [viewModeEnabled, setViewModeEnabled] = useState(false);
  const [zenModeEnabled, setZenModeEnabled] = useState(false);
  const [gridModeEnabled, setGridModeEnabled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved diagram from localStorage on component mount
    const savedDiagram = localStorage.getItem("workchart-diagram");
    if (savedDiagram && excalidrawAPI) {
      const { elements, appState } = JSON.parse(savedDiagram);
      excalidrawAPI.updateScene({ elements, appState });
    }
  }, [excalidrawAPI]);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: any) => {
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
    // Add connections
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
      alert("Mermaid code copied to clipboard!");
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
      const element = {
        type,
        x: centerX,
        y: centerY,
        width: 100,
        height: 100,
        id: nanoid(),
        ...(type === "rectangle"
          ? { text: "Action" }
          : type === "diamond"
          ? { text: "Condition" }
          : { text: "State" }),
      };
      excalidrawAPI.updateScene({
        elements: [
          ...excalidrawAPI.getSceneElements(),
          convertToExcalidrawElements([element])[0],
        ],
      });
    }
  };

  return (
    <div className="App" ref={appRef}>
      <h1>Workchart: Workflow + Flowchart</h1>
      <ExampleSidebar>
        <div className="button-wrapper">
          <Button onClick={() => addNode("rectangle")}>Add Action</Button>
          <Button onClick={() => addNode("diamond")}>Add Condition</Button>
          <Button onClick={() => addNode("ellipse")}>Add State</Button>
          <Button onClick={exportToPNG}>Export to PNG</Button>
          <Button onClick={exportToSVG}>Export to SVG</Button>
          <Button onClick={copyToClipboard}>Copy Mermaid Code</Button>
          <label>
            <input
              type="checkbox"
              checked={viewModeEnabled}
              onChange={() => setViewModeEnabled(!viewModeEnabled)}
            />
            View mode
          </label>
          <label>
            <input
              type="checkbox"
              checked={zenModeEnabled}
              onChange={() => setZenModeEnabled(!zenModeEnabled)}
            />
            Zen mode
          </label>
          <label>
            <input
              type="checkbox"
              checked={gridModeEnabled}
              onChange={() => setGridModeEnabled(!gridModeEnabled)}
            />
            Grid mode
          </label>
          <label>
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={() => setTheme(theme === "light" ? "dark" : "light")}
            />
            Dark Theme
          </label>
        </div>
        <div
          className="excalidraw-wrapper"
          style={{ height: "500px", width: "800px" }}
        >
          <Excalidraw
            ref={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
            onChange={onChange}
            viewModeEnabled={viewModeEnabled}
            zenModeEnabled={zenModeEnabled}
            gridModeEnabled={gridModeEnabled}
            theme={theme}
            name="Workchart"
          />
        </div>
        <div className="mermaid-code">
          <h3>Mermaid Code:</h3>
          <pre>{mermaidCode}</pre>
        </div>
      </ExampleSidebar>
    </div>
  );
};

export default WorkchartExcalidraw;
