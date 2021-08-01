import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  private readonly WASM_EMPTY = 'Let the battle begin...';
  private readonly WASM_GOOD = 'WASM is faster! Sweet.';
  private readonly WASM_BAD = 'WASM is slower? Inconceivable!';

  title = 'angular-wasm-speedtest';
  asmModule: any = null;
  arrayLength: number = 10000;
  sequenceLength: number = 1000;
  functionIterations: number = 100000;
  elapsedJS = 0;
  elapsedWASM = 0;
  result = this.WASM_EMPTY;

  async ngOnInit() {
    this.asmModule = await this.loadWASM();
  }

  async loadWASM() {
    // setup import values for the WASM module
    const importObject = {
      env: {
        abort(_msg: any, _file: any, line: any, column: any) {
          console.error("abort called at:" + line + ":" + column);
        }
      }
    };
    // find the best available API to use
    let module: any;
    if (WebAssembly.instantiateStreaming) {
      // new fancy streaming API
      module = await WebAssembly.instantiateStreaming(
        fetch("wasm/optimized.wasm"),
        importObject
      );
    } else {
      // older ArrayBuffer form
      const wasmFile = await fetch("wasm/optimized.wasm");
      const wasmBuffer = await wasmFile.arrayBuffer();
      module = await WebAssembly.instantiate(
        wasmBuffer,
        importObject
      );
    }
    const moduleFunctions = module.instance.exports;
    return moduleFunctions;
  }

  runTest(implementation: Function, ...args: any) {
    const start: number = Date.now();
    implementation(...args);
    const end: number = Date.now();
    const elapsed: number = end - start;
    return elapsed;
  }

  setResults() {
    if (this.elapsedJS > this.elapsedWASM) {
      this.result = this.WASM_GOOD;
    } else if (this.elapsedWASM > this.elapsedJS) {
      this.result = this.WASM_BAD;
    } else {
      this.result = this.WASM_EMPTY;
    }
  }

  runFibonacciTests() {
    console.log('Fibonacci tests starting');
    this.elapsedJS = this.runTest(this.fibonacciJSTimes.bind(this), this.sequenceLength, this.functionIterations);
    this.elapsedWASM = this.runTest(this.asmModule.fibonacciWASMTimes, this.sequenceLength, this.functionIterations);
    console.log(`elapsed times: ${this.elapsedJS} - ${this.elapsedWASM}`);
    this.setResults();
  }

  fibonacciJSTimes(n: number, t: number) {
    for (let index = 0; index < t; index++) {
      this.fibonacciJS(n);
    }
  }

  fibonacciJS(n: number) {
    var a = 0, b = 1;
    if (n > 0) {
      while (--n) {
        let t = a + b;
        a = b;
        b = t;
      }
      return b;
    }
    return a;
  }

  runBubbleSortTests() {
    console.log('Bubble Sort tests starting');
    this.elapsedJS = this.runTest(this.bubbleSortJS, this.buildItemArrayToSort());
    this.elapsedWASM = this.runTest(this.bubbleSortWASM.bind(this), this.buildItemArrayToSort());
    console.log(`elapsed times: ${this.elapsedJS} - ${this.elapsedWASM}`);
    this.setResults();
  }

  buildItemArrayToSort(): Float32Array {
    const itemsToSort = new Float32Array(this.arrayLength);
    itemsToSort.forEach((_, i) => (itemsToSort[i] = Math.random()));
    return itemsToSort;
  }

  // sort tests attribution:  
  // https://surma.dev/things/js-to-asc/  
  bubbleSortJS(itemsToSort: any) {
    const arr = new Float32Array(itemsToSort); 
    const len = itemsToSort.length;
    for (var i = len - 1; i >= 0; i--) {
      for (var j = 1; j <= i; j++) {
        if (itemsToSort[j - 1] > itemsToSort[j]) {
          var temp = itemsToSort[j - 1];
          itemsToSort[j - 1] = itemsToSort[j];
          itemsToSort[j] = temp;
        }
      }
    }
    // console.log(`sorted js: ${arr}`);
  }

  bubbleSortWASM(itemsToSort: any) {
    const arrayPtr = this.asmModule.newStaticArray(itemsToSort.length);
    const arr = new Float32Array(
      this.asmModule.memory.buffer,
      arrayPtr,
      itemsToSort.length
    );
    arr.set(itemsToSort)
    this.asmModule.sortWASM(arrayPtr);
    // console.log(`sorted wasm: ${arr}`);
  }
}
