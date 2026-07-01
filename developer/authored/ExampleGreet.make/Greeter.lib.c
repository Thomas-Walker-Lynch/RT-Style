#ifndef ExampleGreet·Greeter·ONCE
#define ExampleGreet·Greeter·ONCE

#include "Math.lib.c"

void ExampleGreet·Greeter·hello_loop(int count);

#ifdef ExampleGreet·Greeter
  #include <stdio.h>

  void ExampleGreet·Greeter·hello_loop(int count){ 
    for(int i = 0; i < count; ++i){
      int current_count = ExampleGreet·Math·add(i ,1);
      printf("Hello iteration: %d\n" ,current_count);
    }
  }

#endif // ExampleGreet·Greeter

#endif // ExampleGreet·Greeter·ONCE
